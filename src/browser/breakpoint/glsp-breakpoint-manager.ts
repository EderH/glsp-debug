/********************************************************************************
 * Copyright (c) 2019 EclipseSource and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/
import { Emitter } from "@theia/core";
import { ApplicationShell } from "@theia/core/lib/browser";
import URI from "@theia/core/lib/common/uri";
import { BreakpointManager } from "@theia/debug/lib/browser/breakpoint/breakpoint-manager";
import { SourceBreakpoint } from "@theia/debug/lib/browser/breakpoint/breakpoint-marker";
import { inject, injectable } from "inversify";

import { BaseBreakpoint, GLSPBreakpoint } from "./glsp-breakpoint-marker";


export interface BreakpointsChangeEvent<T extends BaseBreakpoint> {
    uri: URI
    added: T[]
    removed: T[]
    changed: T[]
}

export type GLSPBreakpointsChangeEvent = BreakpointsChangeEvent<GLSPBreakpoint>;

@injectable()
export class GLSPBreakpointManager extends BreakpointManager {

    @inject(ApplicationShell) protected readonly shell: ApplicationShell;

    protected readonly onDidChangeGLSPBreakpointsEmitter = new Emitter<GLSPBreakpointsChangeEvent>();
    readonly onDidChangeGLSPBreakpoints = this.onDidChangeGLSPBreakpointsEmitter.event;

    static GLSP_URI = new URI('debug:glsp://');


    enableAllBreakpoints(enabled: boolean): void {
        for (const uriString of this.getUris()) {
            let didChange = false;
            const uri = new URI(uriString);
            const markers = this.findMarkers({ uri });
            for (const marker of markers) {
                if (marker.data.enabled !== enabled) {
                    marker.data.enabled = enabled;
                    didChange = true;
                }
            }
            if (didChange) {
                this.fireOnDidChangeMarkers(uri);
            }
        }
        let didChangeGLSP = false;
        for (const breakpoint of this.getGLSPBreakpoints()) {
            if (breakpoint.enabled !== enabled) {
                breakpoint.enabled = enabled;
                didChangeGLSP = true;
            }
        }
        if (didChangeGLSP) {
            this.fireOnDidChangeMarkers(GLSPBreakpointManager.GLSP_URI);
        }
    }

    protected _breakpointsEnabled = true;
    get breakpointsEnabled(): boolean {
        return this._breakpointsEnabled;
    }
    set breakpointsEnabled(breakpointsEnabled: boolean) {
        if (this._breakpointsEnabled !== breakpointsEnabled) {
            this._breakpointsEnabled = breakpointsEnabled;
            for (const uri of this.getUris()) {
                this.fireOnDidChangeMarkers(new URI(uri));
            }
            this.fireOnDidChangeMarkers(GLSPBreakpointManager.GLSP_URI);
        }
    }

    hasBreakpoints(): boolean {
        return !!this.getUris().next().value || !!this.glspDiagramBreakpoints.size;
    }

    removeBreakpoints(): void {
        this.cleanAllMarkers();
        this.removeGLSPBreakpoints();
    }

    removeGLSPBreakpoints(): void {
        this.glspDiagramBreakpoints.clear;
    }

    protected glspDiagramBreakpoints = new Map<string, GLSPBreakpoint[]>();

    getGLSPDiagramBreakpoints(uri: string): GLSPBreakpoint[] | undefined {
        return this.glspDiagramBreakpoints.get(uri);
    }

    getGLSPBreakpoints(): GLSPBreakpoint[] {
        const bps = new Array<GLSPBreakpoint>();
        for (const [, value] of this.glspDiagramBreakpoints) {
            for (const bp of value) {
                bps.push(bp);
            }
        }
        return bps;
    }

    setGLSPBreakpoints(uri: string, glspBreakpoints: GLSPBreakpoint[]): void {
        const oldBreakpoints = this.glspDiagramBreakpoints.get(uri) || [];

        this.glspDiagramBreakpoints.set(uri, glspBreakpoints);
        this.fireOnDidChangeMarkers(GLSPBreakpointManager.GLSP_URI);

        const added: GLSPBreakpoint[] = [];
        const removed: GLSPBreakpoint[] = [];
        const changed: GLSPBreakpoint[] = [];
        const ids = new Set<string>();
        for (const newBreakpoint of glspBreakpoints) {
            ids.add(newBreakpoint.id);
            if (oldBreakpoints.find(bp => bp.id === newBreakpoint.id)) {
                changed.push(newBreakpoint);
            } else {
                added.push(newBreakpoint);
            }
        }
        for (const bp of oldBreakpoints) {
            if (!ids.has(bp.id)) {
                removed.push(bp);
            }
        }
        this.onDidChangeGLSPBreakpointsEmitter.fire({ uri: GLSPBreakpointManager.GLSP_URI, added, removed, changed });
    }


    async load(): Promise<void> {
        const data = await this.storage.getData<GLSPBreakpointManager.Data>('breakpoints', {
            breakpointsEnabled: true,
            breakpoints: {},
            glspBreakpoints: {}
        });
        this._breakpointsEnabled = data.breakpointsEnabled;
        // eslint-disable-next-line guard-for-in
        // tslint:disable-next-line: forin
        for (const uri in data.breakpoints) {
            this.setBreakpoints(new URI(uri), data.breakpoints[uri]);
        }
        // eslint-disable-next-line guard-for-in
        // tslint:disable-next-line: forin
        for (const uri in data.glspBreakpoints) {
            this.setGLSPBreakpoints(uri, data.glspBreakpoints[uri]);
        }
    }

    save(): void {
        const data: GLSPBreakpointManager.Data = {
            breakpointsEnabled: this._breakpointsEnabled,
            breakpoints: {},
            glspBreakpoints: {}
        };
        const uris = this.getUris();
        for (const uri of uris) {
            data.breakpoints[uri] = this.findMarkers({ uri: new URI(uri) }).map(marker => marker.data);
        }
        if (this.glspDiagramBreakpoints.size > 0) {
            for (const [key, value] of this.glspDiagramBreakpoints) {
                data.glspBreakpoints[key] = value;
            }
        }
        this.storage.setData('breakpoints', data);
    }
}

export namespace GLSPBreakpointManager {
    export interface Data {
        breakpointsEnabled: boolean
        breakpoints: {
            [uri: string]: SourceBreakpoint[]
        }
        glspBreakpoints: {
            [uri: string]: GLSPBreakpoint[]
        }
    }
}

