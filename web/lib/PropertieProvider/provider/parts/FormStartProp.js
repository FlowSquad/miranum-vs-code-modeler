import {SelectEntry, isSelectEntryEdited} from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';
import { useEffect, useState } from '@bpmn-io/properties-panel/preact/hooks';

export default function(element) {
  return [
    {
      id: 'formKey',
      element,
      component: Form,
      isEdited: isSelectEntryEdited
    }
  ];
}

//camunda:formKey = Embedded or External Task Forms
//camunda:formRef = Camunda Forms
function Form(props) {
  const { element, id } = props;
  const modeling = useService('modeling');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const getValue = () => {
    return element.businessObject.formKey || '';
  };

  const setValue = value => {
    return modeling.updateProperties(element, {
      formKey: value
    });
  };

  //fetch forms (from window variable) and fill Forms with it
  const [ forms, setForms ] = useState([]);
  useEffect(() => {
     setForms(window.forms);
  }, [ setForms ]);

  const getOptions = () => {
    return [
      { label: '<none>', value: undefined },
      ...forms.map(form => ({
        label: form,
        value: form
      }))
    ];
  };

  return SelectEntry({
    element,
    id: {id},
    label: translate('Choose your Form'),
    getValue,
    setValue,
    getOptions,
    debounce
  });
}
