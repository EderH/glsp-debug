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
import { DisableBreakpointAction, EnableBreakpointAction, RemoveBreakpointAction } from "@eclipse-glsp/client-debug/lib/";
import { ApplicationShell } from "@theia/core/lib/browser";
import { inject, injectable } from "inversify";
import { DiagramWidget } from "sprotty-theia/lib";
import { SModelElement } from "sprotty/lib";

import { GLSPBreakpointManager } from "./glsp-breakpoint-manager";


@injectable()
export class GLSPBreakpointDiagramManager {

    @inject(ApplicationShell) protected readonly shell: ApplicationShell;
    @inject(GLSPBreakpointManager) protected readonly breakpointManager: GLSPBreakpointManager;

    getAllBreakpointsByDiagram(): Map<string, SModelElement[]> {
        const bpMap: Map<string, SModelElement[]> = new Map;
        for (const breakpoint of this.breakpointManager.getGLSPBreakpoints()) {
            let bps = bpMap.get(breakpoint.uri);
            if (!bps) {
                bps = new Array<SModelElement>();
                bpMap.set(breakpoint.uri, bps);
            }
            bps.push(breakpoint.element);
        }
        return bpMap;
    }

    enableAllBreakpoints(enable: boolean) {
        const bpMap = this.getAllBreakpointsByDiagram();
        for (const key of bpMap.keys()) {
            const breakpoints = bpMap.get(key);
            if (breakpoints) {
                if (enable) {
                    this.enableDiagramBreakpoints(key, breakpoints);
                } else {
                    this.disableDiagramBreakpoints(key, breakpoints);
                }
            }
        }
    }

    enableDiagramBreakpoints(diagramUri: string, breakpoints: SModelElement[]) {
        const widget = this.findWidget(diagramUri);
        if (widget) {
            widget.actionDispatcher.dispatch(new EnableBreakpointAction(breakpoints));
        }
    }

    disableDiagramBreakpoints(diagramUri: string, breakpoints: SModelElement[]) {
        const widget = this.findWidget(diagramUri);
        if (widget) {
            widget.actionDispatcher.dispatch(new DisableBreakpointAction(breakpoints));
        }
    }

    removeAllBreakpoints() {
        const bpMap = this.getAllBreakpointsByDiagram();
        for (const key of bpMap.keys()) {
            const breakpoints = bpMap.get(key);
            if (breakpoints) {
                this.removeDiagramBreakpoints(key, breakpoints);
            }
        }
    }

    removeDiagramBreakpoints(diagramUri: string, breakpoints: SModelElement[]) {
        const widget = this.findWidget(diagramUri);
        if (widget) {
            widget.actionDispatcher.dispatch(new RemoveBreakpointAction(breakpoints));
        }
    }

    findWidget(diagramUri: string): DiagramWidget | undefined {
        const widgets = this.shell.getWidgets("main").filter(w => w instanceof DiagramWidget) as DiagramWidget[];
        const widget = widgets.find(w => w.uri.path.toString() === diagramUri);
        if (widget) {
            return widget;
        }
        return undefined;
    }
}
