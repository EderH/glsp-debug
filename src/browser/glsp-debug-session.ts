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
import { MessageClient } from "@theia/core";
import { LabelProvider } from "@theia/core/lib/browser";
import URI from "@theia/core/lib/common/uri";
import { DebugSession } from "@theia/debug/lib/browser/debug-session";
import { DebugSessionConnection } from "@theia/debug/lib/browser/debug-session-connection";
import { DebugSessionOptions } from "@theia/debug/lib/browser/debug-session-options";
import { FileSystem } from "@theia/filesystem/lib/common";
import { TerminalService } from "@theia/terminal/lib/browser/base/terminal-service";
import { DebugProtocol } from "vscode-debugprotocol";

import { GLSPBreakpointDiagramManager } from "./breakpoint/glsp-breakpoint-diagram-manager";
import { GLSPBreakpointManager } from "./breakpoint/glsp-breakpoint-manager";
import { DebugGLSPEditorManager } from "./debug-glsp-editor-manager";
import { DebugBreakpoint, DebugBreakpointOptions } from "./model/debug-breakpoint";
import { DebugGLSPBreakpoint } from "./model/debug-glsp-breakpoint";
import { DebugEventOptions, DebugGLSPEvent } from "./model/debug-glsp-event";
import { SelectOptionsDialog } from "./view/dialog";



export class GLSPDebugSession extends DebugSession {

    constructor(
        readonly id: string,
        readonly options: DebugSessionOptions,
        protected readonly connection: DebugSessionConnection,
        protected readonly terminalServer: TerminalService,
        protected readonly editorManager: DebugGLSPEditorManager,
        protected readonly breakpoints: GLSPBreakpointManager,
        protected readonly breakpointsDiagramManager: GLSPBreakpointDiagramManager,
        protected readonly labelProvider: LabelProvider,
        protected readonly messages: MessageClient,
        protected readonly fileSystem: FileSystem) {
        super(id, options, connection, terminalServer, editorManager, breakpoints, labelProvider, messages, fileSystem);
        this.onDidCustomEvent(event => {
            if (event.event = 'onEvent') {
                this.openEventDialogWindow(event.body);
            }
        });
        this.on('stopped', async () => {
            await this.updateEventFlow();

        });
    }

    protected async updateBreakpoints(options: {
        uri?: URI,
        sourceModified: boolean
    }): Promise<void> {
        if (this.updatingBreakpoints) {
            return;
        }
        const { uri } = options;
        for (const affectedUri of this.getAffectedUris(uri)) {
            if (affectedUri.toString() === GLSPBreakpointManager.GLSP_URI.toString()) {
                await this.sendGLSPBreakpoints(affectedUri);
            }
        }
    }

    protected asDebugBreakpointOptions(): DebugBreakpointOptions {
        const { labelProvider, breakpoints, breakpointsDiagramManager, editorManager } = this;
        return { labelProvider, breakpoints, breakpointsDiagramManager, editorManager, session: this };
    }

    protected asDebugEventOptions(): DebugEventOptions {
        const { labelProvider, editorManager } = this;
        return { labelProvider, editorManager, session: this };
    }

    protected *getAffectedUris(uri?: URI): IterableIterator<URI> {
        if (uri) {
            yield uri;
        } else {
            for (const uriString of this.breakpoints.getUris()) {
                yield new URI(uriString);
            }
            yield GLSPBreakpointManager.GLSP_URI;
        }
    }


    protected readonly _glspBreakpoints = new Map<string, DebugBreakpoint[]>();

    getGLSPBreakpoints(): DebugGLSPBreakpoint[] {
        const breakpoints = [];
        for (const breakpoint of this._glspBreakpoints.get(GLSPBreakpointManager.GLSP_URI.toString()) || []) {
            if (breakpoint instanceof DebugGLSPBreakpoint) {
                breakpoints.push(breakpoint);
            }
        }
        return breakpoints;
    }

    protected async sendGLSPBreakpoints(affectedUri: URI): Promise<void> {
        const all = this.breakpoints.getGLSPBreakpoints().map(origin =>
            new DebugGLSPBreakpoint(origin, this.asDebugBreakpointOptions())
        );
        const enabled = all.filter(b => b.enabled);
        try {
            const response = await this.sendCustomRequest('setGLSPBreakpoints', {
                breakpoints: enabled.map(b => ({
                    uri: b.origin.uri, name: b.origin.element.id
                }))
            });
            response.body.breakpoints.map((raw: DebugProtocol.Breakpoint, index: number) => {
                // node debug adapter returns more breakpoints sometimes
                if (enabled[index]) {
                    enabled[index].update({ raw });
                }
            });
        } catch (error) {
            // could be error or promise rejection of DebugProtocol.SetFunctionBreakpoints
            if (error instanceof Error) {
                console.error(`Error setting breakpoints: ${error.message}`);
            } else {
                // handle adapters that send failed DebugProtocol.SetFunctionBreakpoints for invalid breakpoints
                const genericMessage: string = 'GLSP breakpoint not valid for current debug session';
                const message: string = error.message ? `${error.message}` : genericMessage;
                console.warn(`Could not handle GLSP breakpoints: ${message}, disabling...`);
                enabled.forEach(b => b.update({
                    raw: {
                        verified: false,
                        message
                    }
                }));
            }
        }
        this.setGLSPBreakpoints(affectedUri, all);
    }

    protected setGLSPBreakpoints(uri: URI, breakpoints: DebugBreakpoint[]): void {
        this._glspBreakpoints.set(uri.toString(), breakpoints);
        this.fireDidChangeBreakpoints(uri);
    }

    protected async openEventDialogWindow(glspEvents: DebugGLSPEvent[]): Promise<void> {

        const input = new SelectOptionsDialog({
            title: 'Select Trigger event',
            glspEvents: glspEvents,
        });
        const glspEvent = await input.open();
        this.sendCustomRequest('setEvent', { glspEvent });
    }


    protected readonly _glspDebugEvents = new Array<DebugGLSPEvent>();

    getGLSPDebugEvents(): DebugGLSPEvent[] {
        return this._glspDebugEvents;
    }

    protected async updateEventFlow() {
        this._glspDebugEvents.length = 0;
        try {
            const response = await this.sendCustomRequest('eventFlowRequest');
            response.body.eventFlow.map((entry: any) => {
                this._glspDebugEvents.push(new DebugGLSPEvent(entry, this.asDebugEventOptions()));
            });
        } catch (error) {
            // could be error or promise rejection
            if (error instanceof Error) {
                if (!error.message.match('unrecognized request')) {
                    console.error(`Error event: ${error.message}`);
                }
            }
        }
    }


}
