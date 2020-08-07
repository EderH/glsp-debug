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
import { LabelProvider, WidgetManager } from "@theia/core/lib/browser";
import { TreeElement, TreeSource } from "@theia/core/lib/browser/source-tree";
import { DebugState } from "@theia/debug/lib/browser/debug-session";
import { DebugSessionManager } from "@theia/debug/lib/browser/debug-session-manager";
import { DebugViewModel } from "@theia/debug/lib/browser/view/debug-view-model";
import { DebugWidget } from "@theia/debug/lib/browser/view/debug-widget";
import { inject, injectable, postConstruct } from "inversify";

import { GLSPBreakpointDiagramManager } from "../breakpoint/glsp-breakpoint-diagram-manager";
import { GLSPBreakpointManager } from "../breakpoint/glsp-breakpoint-manager";
import { DebugGLSPEditorManager } from "../debug-glsp-editor-manager";
import { GLSPDebugSession } from "../glsp-debug-session";
import { DebugGLSPBreakpoint } from "../model/debug-glsp-breakpoint";



@injectable()
export class DebugGLSPBreakpointsSource extends TreeSource {

    @inject(GLSPBreakpointManager)
    protected readonly breakpoints: GLSPBreakpointManager;
    @inject(GLSPBreakpointDiagramManager)
    protected readonly breakpointsDiagramManager: GLSPBreakpointDiagramManager;
    @inject(DebugSessionManager)
    protected readonly manager: DebugSessionManager;
    @inject(DebugGLSPEditorManager)
    protected readonly editorManager: DebugGLSPEditorManager;
    @inject(LabelProvider)
    protected readonly labelProvider: LabelProvider;
    @inject(WidgetManager)
    protected readonly widgetManager: WidgetManager;
    protected viewModel: DebugViewModel;

    constructor() {
        super({
            placeholder: 'No breakpoints'
        });
    }

    @postConstruct()
    protected init(): void {
        this.fireDidChange();
        this.widgetManager.onDidCreateWidget(({ factoryId, widget }) => {
            if (factoryId === DebugWidget.ID && widget instanceof DebugWidget) {
                this.viewModel = widget['sessionWidget']['model'];
                this.toDispose.push(this.viewModel.onDidChangeBreakpoints(() => this.fireDidChange()));
                this.toDispose.push(this.breakpoints.onDidChangeGLSPBreakpoints(() => this.fireDidChange()));
                this.toDispose.push(this.breakpoints.onDidChangeMarkers(() => this.fireDidChange));
            }
        });
    }

    getCurrentSession(): GLSPDebugSession | undefined {
        let currentSession = this.viewModel.currentSession;
        if (!currentSession) {
            currentSession = this.manager.currentSession;
        }
        if (currentSession && currentSession instanceof GLSPDebugSession) {
            return currentSession;
        }

        return undefined;
    }

    getGLSPBreakpoints(): DebugGLSPBreakpoint[] {
        const session = this.getCurrentSession();
        if (session && session.state > DebugState.Initializing) {
            return session.getGLSPBreakpoints();
        }
        const { labelProvider, breakpoints, breakpointsDiagramManager, editorManager } = this;
        return this.breakpoints.getGLSPBreakpoints().map(origin => new DebugGLSPBreakpoint(origin, { labelProvider, breakpoints, breakpointsDiagramManager, editorManager }));
    }

    *getElements(): IterableIterator<TreeElement> {

        for (const breakpoint of this.getGLSPBreakpoints()) {
            yield breakpoint;
        }

    }
}
