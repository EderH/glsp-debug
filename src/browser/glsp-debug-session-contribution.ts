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
import { LabelProvider, WebSocketConnectionProvider } from "@theia/core/lib/browser";
import { DebugPreferences } from "@theia/debug/lib/browser/debug-preferences";
import { DebugSessionContribution, DebugSessionFactory } from "@theia/debug/lib/browser/debug-session-contribution";
import { FileSystem } from "@theia/filesystem/lib/common";
import { OutputChannelManager } from "@theia/output/lib/common/output-channel";
import { TerminalService } from "@theia/terminal/lib/browser/base/terminal-service";
import { inject, injectable } from "inversify";

import { GLSPBreakpointDiagramManager } from "./breakpoint/glsp-breakpoint-diagram-manager";
import { GLSPBreakpointManager } from "./breakpoint/glsp-breakpoint-manager";
import { DebugGLSPEditorManager } from "./debug-glsp-editor-manager";
import { GLSPDebugSessionFactory } from "./glsp-debug-session-factory";


@injectable()
export class GLSPDebugSessionContribution implements DebugSessionContribution {

    private _glspDebugSessionFactory: GLSPDebugSessionFactory;
    debugType: string;

    constructor(
        @inject(DebugGLSPEditorManager) editorManager: DebugGLSPEditorManager,
        @inject(TerminalService) terminalService: TerminalService,
        @inject(WebSocketConnectionProvider) connectionProvider: WebSocketConnectionProvider,
        @inject(GLSPBreakpointManager) breakpoints: GLSPBreakpointManager,
        @inject(GLSPBreakpointDiagramManager) breakpointsDiagramManager: GLSPBreakpointDiagramManager,
        @inject(LabelProvider) labelProvider: LabelProvider,
        @inject(MessageClient) messages: MessageClient,
        @inject(OutputChannelManager) outputChannelManager: OutputChannelManager,
        @inject(DebugPreferences) debugPreferences: DebugPreferences,
        @inject(FileSystem) fileSystem: FileSystem,
    ) {
        this._glspDebugSessionFactory = new GLSPDebugSessionFactory({
            terminalService, editorManager, breakpoints, breakpointsDiagramManager, labelProvider,
            messages, outputChannelManager, connectionProvider, debugPreferences, fileSystem
        });
    }

    debugSessionFactory(): DebugSessionFactory {
        return this._glspDebugSessionFactory;
    }
}
