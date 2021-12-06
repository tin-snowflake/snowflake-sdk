use solana_program::program_error::ProgramError;
use std::convert::TryInto;

pub fn unpack_i8(input: &[u8], position: usize) -> Result<i8, ProgramError> {
    if input.len() < position + 1 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let value = input
        .get(position..(position + 1))
        .and_then(|slice| slice.try_into().ok())
        .map(i8::from_le_bytes)
        .ok_or(ProgramError::InvalidInstructionData)?;
    Ok(value)
}

pub fn unpack_i64(input: &[u8], position: usize) -> Result<i64, ProgramError> {
    if input.len() < position + 8 {
        return Err(ProgramError::InvalidInstructionData);
    }

    let value = input
        .get(position..(position + 8))
        .and_then(|slice| slice.try_into().ok())
        .map(i64::from_le_bytes)
        .ok_or(ProgramError::InvalidInstructionData)?;
    Ok(value)
}

pub fn unpack_u8(input: &[u8], position: usize) -> Result<u8, ProgramError> {
    if input.len() < position + 1 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let value = input
        .get(position..(position + 1))
        .and_then(|slice| slice.try_into().ok())
        .map(u8::from_le_bytes)
        .ok_or(ProgramError::InvalidInstructionData)?;
    Ok(value)
}

pub fn get_price(price: i64, exponent: i32) -> f64 {
    if exponent == 0 {
        return price as f64;
    } else if exponent >= 0 {
        return (price as f64) * (i32::pow(10, exponent as u32) as f64);
    } else {
        return (price as f64) / (i32::pow(10, (-exponent) as u32) as f64);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_price() {
        let a = get_price(1982, 0);
        println!("a is {}", a);

        let b = get_price(23456, 1);
        println!("b is {}", b);

        let c = get_price(198712, -8);
        println!("c is {}", c);
    }
}