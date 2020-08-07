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
import { MaybePromise } from "@theia/core";
import { AbstractDialog, DialogError, DialogMode, DialogProps, Message } from "@theia/core/lib/browser";
import { inject, injectable } from "inversify";

import { DebugGLSPEvent } from "../model/debug-glsp-event";


@injectable()
export class SelectOptionsDialogProps extends DialogProps {
    readonly confirmButtonLabel?: string;
    readonly glspEvents: DebugGLSPEvent[];

    readonly validate?: (input: string, mode: DialogMode) => MaybePromise<DialogError>;
}

export class SelectOptionsDialog extends AbstractDialog<string> {

    protected readonly dropDownMenu: HTMLSelectElement;
    protected readonly options: HTMLOptionsCollection;
    protected option: HTMLOptionElement;

    constructor(
        @inject(SelectOptionsDialogProps) protected readonly props: SelectOptionsDialogProps
    ) {
        super(props);

        this.dropDownMenu = document.createElement('select');

        this.options = this.dropDownMenu.options;
        if (props.glspEvents) {
            props.glspEvents.forEach(glspEvent => {
                this.option = document.createElement('option');
                this.option.style.backgroundColor = '#2e2e2e';
                this.option.value = glspEvent.name;
                this.option.text = glspEvent.elementID + "-" + glspEvent.name;
                this.options.add(this.option);
            });
        }
        this.contentNode.appendChild(this.dropDownMenu);

        this.appendAcceptButton(props.confirmButtonLabel);
    }

    get value(): string {
        return this.dropDownMenu.value;
    }

    protected isValid(value: string, mode: DialogMode): MaybePromise<DialogError> {
        if (this.props.validate) {
            return this.props.validate(value, mode);
        }
        return super.isValid(value, mode);
    }

    protected onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg);
        this.addUpdateListener(this.dropDownMenu, 'select');
    }

    protected onActivateRequest(msg: Message): void {
        this.dropDownMenu.focus();
    }

}
