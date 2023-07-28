import { i18n } from "../utils/i18n";

export function getErrorMessage(error:any, extra: any = undefined): string {
    try {
      switch(error.statusCode) {
        case 410: 
            return extra == undefined ? i18n.__mf("common.ageRestrictionNoSong") : i18n.__mf("common.ageRestriction", { song: extra });
        default: return i18n.__mf("common.errorCommandUnknown", { err: error });
      }
    } catch (e) {
      console.error(e);
      return i18n.__("common.errorCommand");
    }
}