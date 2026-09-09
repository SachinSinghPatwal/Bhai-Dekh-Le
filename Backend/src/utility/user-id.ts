const mongoObjectIdPattern = /^[a-f\d]{24}$/i;

export function isMongoObjectId(value: string): boolean {
  return mongoObjectIdPattern.test(value);
}

export function assertMongoObjectId(value: string): void {
  if (!isMongoObjectId(value)) {
    throw new Error(
      'Invalid user ID. Pass the user\'s MongoDB _id (a 24-character hexadecimal value).'
    );
  }
}
