import React, { useEffect, useState } from 'react';
import { Form } from 'antd';
import { useFormValidator } from '../FormValidator';
import { PublicKey } from '@solana/web3.js';

export function FormItem(props) {
  const formValidator = useFormValidator();
  const form = formValidator.form;

  const validators: FieldValidator[] = props.validators;
  const validatingValue = props.validate;
  let [key] = useState(+new Date());
  let [errors, setErrors] = useState([]);
  let [touch, setTouch] = useState(false);
  useEffect(() => {
    // register validator
    form[key] = { validators, validatingValue };
    console.log('props change', { form, touch });
    if (touch) validate();
    if (!touch) {
      touch = true;
      setTouch(touch);
    }

    return function cleanup() {
      delete form[key];
    };
  }, [props.validate, formValidator.submit]);

  function validate() {
    let updatedErrors = [];

    for (let validator of validators) {
      const newErrors = validator.validate(validatingValue);
      updatedErrors = [...newErrors, ...updatedErrors];
      if (newErrors.length > 0) break; // stop on the first validator error
    }

    setErrors(updatedErrors);
  }

  return (
    <Form.Item {...props} help={errors.length > 0 ? errors : undefined} validateStatus={errors.length > 0 ? 'error' : ''}>
      {props.children}
    </Form.Item>
  );
}

interface FieldValidator {
  validate: (value) => string[];
}

export class FieldRequire implements FieldValidator {
  msg: string = 'Field is required.';
  constructor(msg?: string) {
    if (msg) this.msg = msg;
  }
  validate(value): string[] {
    if (!value) return [this.msg];
    return [];
  }
}

export class FieldIsPubKey implements FieldValidator {
  msg: string = 'Invalid public key input.';
  constructor(msg?: string) {
    if (msg) this.msg = msg;
  }

  validate(value): string[] {
    if (!value) return [this.msg];
    else {
      try {
        new PublicKey(value);
      } catch (e) {
        return [this.msg];
      }
      return [];
    }
  }
}
