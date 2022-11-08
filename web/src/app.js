import $ from 'jquery';
//import  * as colors from "colors";
import BpmnModeler from 'bpmn-js/lib/Modeler';
import {
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    CamundaPlatformPropertiesProviderModule,
    ElementTemplatesPropertiesProviderModule
} from "bpmn-js-properties-panel";

// Propertie Extensions
import CamundaPlatformBehaviors from 'camunda-bpmn-js-behaviors/lib/camunda-platform';
import camundaModdleDescriptors from 'camunda-bpmn-moddle/resources/camunda';
import miragonProviderModule from '../PropertieProvider/provider/index';
import ElementTemplateChooserModule from '@bpmn-io/element-template-chooser';

//default diagram
import EMPTY_DIAGRAM_XML from '../../resources/bpmn/empty.bpmn?raw';

// css
import './app.css';
import '../../node_modules/bpmn-js/dist/assets/bpmn-js.css';
import '../../node_modules/bpmn-js/dist/assets/diagram-js.css';
import '../../node_modules/bpmn-js-properties-panel/dist/assets/properties-panel.css';
import '../../node_modules/bpmn-js-properties-panel/dist/assets/element-templates.css';
import '../../node_modules/@bpmn-io/element-template-chooser/dist/element-template-chooser.css';

// element templates
import sendMail from '../../examples/element-templates/mail-task-template.json';

// Only for developing
const ENVIROMENTS = {
    Browser: 'browser',
    VsCode: 'vscode'
};
const ENV = ENVIROMENTS.VsCode;

const container = $('#js-drop-zone');
let templates;

// for env === borwser
let textarea;

if (ENV === 'vscode') {
    //console.log(colors.cyan("Environment: vscode"));
    // 'vscode' is set before we load this script
    const state = vscode.getState();
    if (state) {
        // here get the files
        //forms needs to be on window layer, so we can work with it in FormSimpProps
        files = JSON.parse(state.files);
        templates = files[0];
        window.forms = files[1];
        //console.log(colors.cyan("Initialised: templates & forms"));
    }

} else if (ENV === 'browser') {
    //console.log(colors.cyan("Environment: browser"));
    templates = [sendMail];
    //forms?

    const simulator = document.createElement('div');  // simulates vscode respectively the document
    textarea = document.createElement('textarea');
    const style = document.createElement('style');

    simulator.className = 'simulator';
    textarea.className = 'editor';
    style.textContent = `
       .content {
           height: 70%;
       }
       .simulator {
           width: 100%;
           height: 30%;
       }
       .editor {
           width: 100%;
           height: 100%;
           resize: none;
       }
    `;

    simulator.appendChild(style);
    simulator.appendChild(textarea);
    document.body.appendChild(simulator);
}

const modeler = new BpmnModeler({
    container: '#js-canvas',
    keyboard: {
        bindTo: document
    },
    propertiesPanel: {
        parent: '#js-properties-panel'
    },
    additionalModules: [
        // standard properties panel
        BpmnPropertiesPanelModule,
        BpmnPropertiesProviderModule,
        // camunda properties panel
        CamundaPlatformPropertiesProviderModule,
        CamundaPlatformBehaviors,
        // element templates
        ElementTemplatesPropertiesProviderModule,
        ElementTemplateChooserModule,
        // form simplifier
        miragonProviderModule
    ],
    moddleExtensions: {
        camunda: camundaModdleDescriptors
    },
    elementTemplates: templates
});
container.removeClass('with-diagram');

async function importDiagram(xml) {

    if (!xml) {
        xml = EMPTY_DIAGRAM_XML;
    }

    if (ENV === 'vscode') {
        // Set state when diagram is opened
        vscode.setState({
            text: xml
        });
    }

    try {
        await modeler.importXML(xml);
        container
            .removeClass('with-error')
            .addClass('with-diagram');
        //console.log(colors.cyan("loaded / updated xml"));
    } catch (err) {
        container
            .removeClass('with-diagram')
            .addClass('with-error');

        container.find('.error pre').text(err.message);
        console.error(err);
        //console.log(colors.red.bold("ERROR: ") + err.message);
    }
}

async function exportDiagram() {
    //console.log(colors.cyan("exported diagram"));
    return (await modeler.saveXML({format: true}));
}

// main
$(function () {
    if (ENV === 'vscode') {
        const state = vscode.getState();
        if (state) {
            importDiagram(state.text);
        }

        window.addEventListener('message', (event) => {
            const message = event.data;
            switch (message.type) {
                case 'bpmn-modeler.updateFromExtension': {
                    const xml = message.text;
                    importDiagram(xml);
                    return;
                }
            }
        });

    } else if (ENV === 'browser') {
        importDiagram();
    }

    const updateExtension = debounce(async function () {

        try {
            exportDiagram()
                .then((content) => {
                    if (ENV === 'vscode') {
                        // Set state when changes occur
                        vscode.setState({
                            text: content.xml
                        });
                        // Send update to extension
                        vscode.postMessage({
                            type: 'bpmn-modeler.updateFromWebview', content: content.xml
                        });
                    } else if (ENV === 'browser') {
                        textarea.value = content.xml;
                    }
                });
            //console.log(colors.green.bold("Saved ") + "xml");

        } catch (err) {
            //console.log(colors.red.bold("Error: ") + err.message);
            console.error('Error happened saving XML: ', err);
        }
    }, 500);

    modeler.on('commandStack.changed', updateExtension);
});


//  ---------------HELPERS---------------  \\
function debounce(fn, timeout) {
    let timer;

    return function () {
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(fn, timeout);
    };
}