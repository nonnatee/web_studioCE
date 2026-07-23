import { FormRenderer } from "@web/views/form/form_renderer";
import { useService } from "@web/core/utils/hooks";

export class StudioFormRenderer extends FormRenderer {
    static props = {
        ...FormRenderer.props,
        "*": true,
    };

    setup() {
        super.setup();
        this.studio = useService("studio");
        this.orm = useService("orm");
    }

    onElementSelect(ev, type, xpath, name) {
        const target = ev?.currentTarget;
        if (target) {
            xpath = xpath || target.dataset.studioXpath;
            name = name || target.dataset.studioName;
        }

        let invisible = false;
        let readonly = false;
        let required = false;

        if (type === "field" && name) {
            const fieldInfo = this.props.archInfo?.fieldNodes?.[name] || {};
            const mods = fieldInfo.modifiers || {};
            invisible = !!mods.invisible;
            readonly = !!mods.readonly;
            required = !!mods.required;
        }

        this.studio.setSelectedElement({
            type,
            xpath,
            name,
            string: (name && this.props.record?.fields?.[name]?.string) || name || type,
            invisible,
            readonly,
            required,
        });
    }

    onDragOver(ev) {
        if (!ev.currentTarget.classList.contains("o_studio_drag_hover")) {
            ev.currentTarget.classList.add("o_studio_drag_hover");
        }
        ev.preventDefault();
    }

    onDragLeave(ev) {
        ev.currentTarget.classList.remove("o_studio_drag_hover");
    }

    async onDrop(ev, targetXpath, position) {
        ev.currentTarget.classList.remove("o_studio_drag_hover");
        const target = ev?.currentTarget;
        if (target) {
            targetXpath = targetXpath || target.dataset.studioXpath;
            position = position || target.dataset.studioPosition || "after";
        }
        
        const newFieldData = ev.dataTransfer.getData("studio/new-field");
        const existingFieldName = ev.dataTransfer.getData("studio/existing-field");

        if (newFieldData) {
            const { type, label } = JSON.parse(newFieldData);
            this.studio.openFieldCreationModal(type, label, targetXpath, position);
        } else if (existingFieldName) {
            await this.studio.pushAction(async () => {
                await this.orm.call("studio.editor", "add_field_to_view", [], {
                    model_name: this.studio.activeModel,
                    view_id: this.studio.activeViewId,
                    target_xpath: targetXpath,
                    position: position,
                    field_name: existingFieldName,
                });
            });
        }
    }
}

