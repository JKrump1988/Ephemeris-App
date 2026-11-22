const BIRTH_TIME_PATTERN =
  /^(?:[01][0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9](?:\.[0-9]{1,6})?)?$/;


export const isValidBirthTime = (value) =>
  typeof value === "string" &&
  value === value.trim() &&
  BIRTH_TIME_PATTERN.test(value);
