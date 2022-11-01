(function() {
    'use strict';
    NgChm.markFile();

    // Define Namespace for NgChm MatrixManager
    const MAPREP = NgChm.createNS('NgChm.MAPREP');

    // Special values in NG-CHM representation:
    MAPREP.maxValues = 2147483647;
    MAPREP.minValues = -2147483647;

    // Supported map data summary levels.
    MAPREP.THUMBNAIL_LEVEL = 'tn';
    MAPREP.SUMMARY_LEVEL = 's';
    MAPREP.RIBBON_VERT_LEVEL = 'rv';
    MAPREP.RIBBON_HOR_LEVEL = 'rh';
    MAPREP.DETAIL_LEVEL = 'd';

})();
