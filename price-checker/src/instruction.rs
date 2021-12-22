use solana_program::program_error::ProgramError;
use crate::utils;

pub const CONDITION_GREATER_OR_EQUAL: i8 = 1;
pub const CONDITION_LESS_OR_EQUAL: i8 = -1;


#[derive(Debug)]
pub struct PriceCheckCriteria {
    pub criteria: Vec<PriceCondition>
}

impl PriceCheckCriteria {
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        if input.len() == 0 || input.len() % 10 != 0 {
            return Err(ProgramError::InvalidInstructionData);
        }

        let mut criteria: Vec<PriceCondition> = Vec::new();

        let mut position = 0;
        while position < input.len() {
            let price = utils::unpack_i64(input, position)?;
            position += 8;
            let price_exponent = utils::unpack_i8(input, position)?;
            position += 1;
            let condition = utils::unpack_i8(input, position)?;
            position += 1;

            criteria.push(PriceCondition{price, price_exponent, condition});
        }
        Ok (PriceCheckCriteria {criteria})
    }
}

#[derive(Debug)]
pub struct PriceCondition {
    pub price: i64,
    pub price_exponent: i8,
    pub condition: i8,
}

impl PriceCondition {
    pub fn match_condition(self, price: i64, exponent: i32) -> bool {
        let target = utils::get_price(self.price,self.price_exponent as i32);
        let actual_price = utils::get_price(price, exponent);

        match self.condition {
            CONDITION_GREATER_OR_EQUAL => actual_price >= target,
            CONDITION_LESS_OR_EQUAL => actual_price <= target,
            _ => false
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_unpack() {
        let mut input: Vec<u8> = Vec::new();

        add_values(&mut input, 19814, -2, CONDITION_GREATER_OR_EQUAL);
        add_values(&mut input, 300, 0, CONDITION_GREATER_OR_EQUAL);
        add_values(&mut input, 122, 1, CONDITION_LESS_OR_EQUAL);

        let result = PriceCheckCriteria::unpack(&input).unwrap();
        println!("Result: {:?}", result);
    }

    fn add_values(input: &mut Vec<u8>, price: i64, exponent: i8, condition: i8) {
        for &item in &price.to_le_bytes() {
            input.push(item);
        }

        for &item in &exponent.to_le_bytes() {
            input.push(item);
        }

        for &item in &condition.to_le_bytes() {
            input.push(item);
        }
    }
}