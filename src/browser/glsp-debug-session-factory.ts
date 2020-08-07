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
import { DebugSession } from "@theia/debug/lib/browser/debug-session";
import { DebugSessionConnection } from "@theia/debug/lib/browser/debug-session-connection";
import { DefaultDebugSessionFactory } from "@theia/debug/lib/browser/debug-session-contribution";
import { DebugSessionOptions } from "@theia/debug/lib/browser/debug-session-options";
import { DebugAdapterPath } from "@theia/debug/lib/common/debug-service";
import { FileSystem } from "@theia/filesystem/lib/common";
import { OutputChannelManager } from "@theia/output/lib/common/output-channel";
import { TerminalService } from "@theia/terminal/lib/browser/base/terminal-service";
import { injectable } from "inversify";
import { IWebSocket } from "vscode-ws-jsonrpc/lib/socket/socket";

import { GLSPBreakpointDiagramManager } from "./breakpoint/glsp-breakpoint-diagram-manager";
import { GLSPBreakpointManager } from "./breakpoint/glsp-breakpoint-manager";
import { DebugGLSPEditorManager } from "./debug-glsp-editor-manager";
import { GLSPDebugSession } from "./glsp-debug-session";




export interface GLSPDebugSessionFactoryServices {
    readonly terminalService: TerminalService,
    readonly editorManager: DebugGLSPEditorManager,
    readonly breakpoints: GLSPBreakpointManager,
    readonly breakpointsDiagramManager: GLSPBreakpointDiagramManager,
    readonly labelProvider: LabelProvider,
    readonly messages: MessageClient,
    readonly outputChannelManager: OutputChannelManager,
    readonly connectionProvider: WebSocketConnectionProvider,
    readonly debugPreferences: DebugPreferences,
    readonly fileSystem: FileSystem
}

@injectable()
export class GLSPDebugSessionFactory extends DefaultDebugSessionFactory {

    readonly terminalService: TerminalService;
    readonly editorManager: DebugGLSPEditorManager;
    readonly breakpoints: GLSPBreakpointManager;
    readonly breakpointsDiagramManager: GLSPBreakpointDiagramManager;
    readonly labelProvider: LabelProvider;
    readonly messages: MessageClient;
    readonly outputChannelManager: OutputChannelManager;
    readonly connectionProvider: WebSocketConnectionProvider;
    readonly debugPreferences: DebugPreferences;
    readonly fileSystem: FileSystem;

    constructor(
        services: GLSPDebugSessionFactoryServices
    ) {
        super();
        Object.assign(this, services);
    }

    get(sessionId: string, options: DebugSessionOptions): DebugSession {
        const connection = new DebugSessionConnection(
            sessionId,
            () => new Promise<IWebSocket>(resolve =>
                this.connectionProvider.openChannel(`${DebugAdapterPath}/${sessionId}`, channel => {
                    resolve(channel);
                }, { reconnecting: false })
            ),
            this.getTraceOutputChannel());

        return new GLSPDebugSession(
            sessionId,
            options,
            connection,
            this.terminalService,
            this.editorManager,
            this.breakpoints,
            this.breakpointsDiagramManager,
            this.labelProvider,
            this.messages,
            this.fileSystem);
    }
}
