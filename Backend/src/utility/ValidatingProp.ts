export default function ValidatingAndSettingProp(
  each: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const currentProp = (each.footerPlaceholderLabel as string).split(" ")[0];
  const isString: boolean = isNaN(Number(currentProp.replace("+", "")));

  // if currentProp is a Number
  if (!isString && Number(currentProp.replace("+", "")) < 3) {
    return {
      [each.title as string]: Number(
        (each.footerPlaceholderLabel as string).split(" ")[0],
      ),
    };
  }
  // console.log("two");
  // if current prop is Not a number
  else {
    if (
      currentProp.includes("Just") ||
      currentProp.includes("Few") ||
      currentProp.includes("hours")
    )
      return {
        [each.title as string]: each.footerPlaceholderLabel,
      };
  }
}
