import {z, ZodEffects, ZodString} from "zod";
import {ZodType} from "zod/lib/types";

export type CanFail<Type> = {success: false, msg: string} | ({ success: true} & Type)
export type CanFailSingleItem<Type> = {success: false, msg: string} | ({ success: true, item: Type})
export type CanFailNoPayload = {success: false, msg: string} | {success: true}

/**
 * Used for encoded query string parameters
 */
export function zod_base64<T>(obj: ZodType<T,any,any>): ZodEffects<ZodString, T> {
    return z
        .string()
        .transform((val, ctx) => {
            let d
            try {
                d = Buffer.from(val, 'base64').toString('binary')
            } catch(ex) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Could not decode base64 buffer.",
                });

                // This is a special symbol you can use to
                // return early from the transform function.
                // It has type `never` so it does not affect the
                // inferred return type.
                return z.NEVER;
            }

            try {
                d = JSON.parse(d)
            } catch(ex) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Base64 payload was not valid JSON.",
                });

                return z.NEVER;
            }

            return obj.parse(d)
        })
}