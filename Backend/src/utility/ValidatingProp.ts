export default function ValidatingProp(
  each: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const currentProp = (each.footerPlaceholderLabel as string).split(" ")[0];
  const curretnPropIsNan: boolean = isNaN(Number(currentProp));

  // if currentProp is a Number
  if (!curretnPropIsNan && Number(currentProp) < 3) {
    console.log("logger1");
    return {
      [each.title as string]: Number(
        (each.footerPlaceholderLabel as string).split(" ")[0],
      ),
    };
  }
  // if current prop is Not a number
  return {
    [each.title as string]: each.footerPlaceholderLabel,
  };
}
