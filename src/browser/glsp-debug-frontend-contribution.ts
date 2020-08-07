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
import { CommandContribution, CommandRegistry } from "@theia/core";
import { Widget, WidgetManager } from "@theia/core/lib/browser";
import { DebugCommands } from "@theia/debug/lib/browser/debug-frontend-application-contribution";
import { DebugBreakpointsWidget } from "@theia/debug/lib/browser/view/debug-breakpoints-widget";
import { DebugWidget } from "@theia/debug/lib/browser/view/debug-widget";
import { inject, injectable, postConstruct } from "inversify";

import { GLSPBreakpointDiagramManager } from "./breakpoint/glsp-breakpoint-diagram-manager";
import { GLSPBreakpointManager } from "./breakpoint/glsp-breakpoint-manager";
import { GLSPStackFrameDiagramManager } from "./stackframe/glsp-stackframe-diagram-manager";
import { DebugGLSPBreakpointsSource } from "./view/debug-glsp-breakpoints-source";
import { DebugGLSPEventsWidget } from "./view/debug-glsp-events-widget";


@injectable()
export class GLSPDebugFrontendContribution implements CommandContribution {


    @inject(GLSPBreakpointManager) protected readonly breakpointManager: GLSPBreakpointManager;
    @inject(WidgetManager) protected readonly widgetManager: WidgetManager;
    @inject(GLSPBreakpointDiagramManager) protected readonly breakpointsDiagramManager: GLSPBreakpointDiagramManager;
    @inject(GLSPStackFrameDiagramManager) protected readonly stackFrameDiagramManager: GLSPStackFrameDiagramManager;
    @inject(DebugGLSPBreakpointsSource) protected readonly debugSource: DebugGLSPBreakpointsSource;
    @inject(DebugGLSPEventsWidget) protected readonly eventWidget: DebugGLSPEventsWidget;

    @postConstruct()
    protected init(): void {
        this.widgetManager.onDidCreateWidget(({ factoryId, widget }) => {
            if (factoryId === DebugWidget.ID && widget instanceof DebugWidget) {
                const breakpointWidget = widget['sessionWidget']['breakpoints'];
                breakpointWidget.source = this.debugSource;
                const viewContainer = widget['sessionWidget']['viewContainer'];
                viewContainer.addWidget(this.eventWidget);
            }
        });
    }

    registerCommands(registry: CommandRegistry): void {

        registry.unregisterCommand(DebugCommands.ENABLE_ALL_BREAKPOINTS);
        registry.unregisterCommand(DebugCommands.DISABLE_ALL_BREAKPOINTS);
        registry.unregisterCommand(DebugCommands.REMOVE_ALL_BREAKPOINTS);
        registry.registerCommand(DebugCommands.ENABLE_ALL_BREAKPOINTS, {
            execute: () => { this.breakpointManager.enableAllBreakpoints(true); this.breakpointsDiagramManager.enableAllBreakpoints(true); },
            isEnabled: () => this.breakpointManager.hasBreakpoints()
        });
        registry.registerCommand(DebugCommands.DISABLE_ALL_BREAKPOINTS, {
            execute: () => { this.breakpointManager.enableAllBreakpoints(false); this.breakpointsDiagramManager.enableAllBreakpoints(false); },
            isEnabled: () => this.breakpointManager.hasBreakpoints()
        });

        registry.registerCommand(DebugCommands.REMOVE_ALL_BREAKPOINTS, {
            execute: () => this.breakpointsDiagramManager.removeAllBreakpoints(),
            isEnabled: () => this.breakpointManager.hasBreakpoints(),
            isVisible: widget => !(widget instanceof Widget) || (widget instanceof DebugBreakpointsWidget)
        });

    }
}
