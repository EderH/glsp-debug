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
import { ApplicationShell } from "@theia/core/lib/browser";
import { DebugSessionManager } from "@theia/debug/lib/browser/debug-session-manager";
import { inject, injectable, postConstruct } from "inversify";

import { DebugGLSPEditorManager } from "../debug-glsp-editor-manager";
import { AnnotateStackFrame } from "./annotate-stackframe";



@injectable()
export class GLSPStackFrameDiagramManager {

    @inject(DebugSessionManager) protected readonly debugManager: DebugSessionManager;
    @inject(DebugGLSPEditorManager) protected readonly editorManager: DebugGLSPEditorManager;
    @inject(ApplicationShell) protected readonly shell: ApplicationShell;

    private sessions = new Map<string, AnnotateStackFrame>();

    @postConstruct()
    protected init(): void {
        this.debugManager.onDidStartDebugSession(
            session => {
                this.sessions.set(session.id, new AnnotateStackFrame(session, this.shell, this.editorManager));
            });

        this.debugManager.onDidDestroyDebugSession(session => {
            const annotateStack = this.sessions.get(session.id);
            if (annotateStack) {
                annotateStack.clearStackAnnotation();
            }
            this.sessions.delete(session.id);
        });
    }
}
