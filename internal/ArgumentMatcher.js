/**
 * @class ArgumentMatcher
 * @description Template class for checking if a string matches a certain pattern.
 */
export class ArgumentMatcher {
    /**
     *
     * @param _value the value to match against
     * @returns
     */
    matches(_value, _context) {
        return {
            success: false,
            error: "NOT IMPLEMENTED",
        };
    }
    /**
     * DO NOT USE, INTERNAL METHOD
     * @param name
     * @returns
     * @private
     */
    setName(name) {
        this.name = name;
        return this;
    }
}
