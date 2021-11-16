import React, { SetStateAction, useContext, useState } from 'react';

const FormValidator = React.createContext({ form: {}, submit: false, setSubmit: v => {}, test: 'def' });
export function FormValidatorProvider({ children = undefined as any }) {
  const [formState] = useState({});
  const [submit, setSubmit] = useState(false);
  const value: any = { form: formState, submit: submit, setSubmit: setSubmit, test: 'abc1' };
  return <FormValidator.Provider value={value}>{children}</FormValidator.Provider>;
}

export function useFormValidator() {
  return useContext(FormValidator);
}

export function validateForm(formValidator): string[] {
  let { form, submit, setSubmit } = formValidator;
  let errors = [];
  for (let key in form) {
    let { validators, validatingValue } = form[key];
    validators.forEach(function (validator) {
      const newErrors = validator.validate(validatingValue);
      errors = [...newErrors, ...errors];
    });
  }
  setSubmit(Date.now());

  return errors;
}
