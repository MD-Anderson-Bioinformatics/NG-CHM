//==============================================//
// Link out file for standard Galaxy Heat Maps  //
//==============================================//

// ##### "OPEN" linkouts


// Linkouts to Amigo
linkouts.addLinkout("View Amigo", "bio.go", linkouts.SINGLE_SELECT, function (names) {
    var goid = names[0];
    window.open('http://amigo.geneontology.org/cgi-bin/amigo/term_details?term=' + goid, 'linkout');
});


// Linkouts to bioGPS
linkouts.addLinkout("View bioGPS", "bio.gene.hugo", linkouts.SINGLE_SELECT, function (names) {
    var gname = names[0];
    window.open('http://biogps.org/search/?q=' + gname, 'linkout');
});


// cBioPortal linkouts
linkouts.addLinkout("View in cBio Portal", "bio.gene.hugo", linkouts.MULTI_SELECT, function( genes ){
    var studyid = linkouts.getAttribute('studyId');
    window.open('http://www.cbioportal.org/ln?cancer_study_id=' + studyid + '&gene_list=' + genes.join("+"), 'linkout');
}, ["studyId"]);
(function() {
    function openCBIOSamp (ids) {
        var studyid = linkouts.getAttribute('studyId');
        window.open('http://www.cbioportal.org/case.do?cancer_study_id=' + studyid + '&case_id=' + ids[0], 'linkout');
    }
    linkouts.addLinkout("View in cBio Portal", "bio.cbioportal.sampleid", linkouts.SINGLE_SELECT, openCBIOSamp);

    // Automatically linkout to cBioPortal for TCGA samples
    function openCBIOSampTCGA (ids) {
        var part = ids[0].substring(0,12);
        openCBioSamp ([part]);
    }
    linkouts.addLinkout("View in cBio Portal", "bio.tcga.barcode.sample", linkouts.SINGLE_SELECT, openCBIOSampTCGA);
    linkouts.addLinkout("View in cBio Portal", "bio.tcga.barcode.sample.vial", linkouts.SINGLE_SELECT, openCBIOSampTCGA);
    linkouts.addLinkout("View in cBio Portal", "bio.tcga.barcode.sample.vial.portion", linkouts.SINGLE_SELECT, openCBIOSampTCGA);
    linkouts.addLinkout("View in cBio Portal", "bio.tcga.barcode.sample.vial.portion.analyte", linkouts.SINGLE_SELECT, openCBIOSampTCGA);
    linkouts.addLinkout("View in cBio Portal", "bio.tcga.barcode.sample.vial.portion.analyte.aliquot", linkouts.SINGLE_SELECT, openCBIOSampTCGA);
})();


// Linkouts to ClinVar
linkouts.addLinkout("View ClinVar", "bio.gene.hugo", linkouts.SINGLE_SELECT, function (names) {
    var gname = names[0];
    window.open('https://www.ncbi.nlm.nih.gov/clinvar/?term=' + gname + '%5Bgene%5D', 'linkout');
});


// Linkouts to Cosmic
linkouts.addLinkout("View Cosmic", "bio.gene.hugo", linkouts.SINGLE_SELECT, function (names) {
    var gname = names[0];
    window.open('http://cancer.sanger.ac.uk/cosmic/gene/analysis?ln=' + gname, 'linkout');
});


// Linkouts to Decipher
linkouts.addLinkout("View Decipher", "bio.gene.hugo", linkouts.SINGLE_SELECT, function (names) { 
    var gname = names[0];
    window.open('https://decipher.sanger.ac.uk/search?q=' + gname, 'linkout');
});


// Linkouts to FireBrowse
linkouts.addLinkout("View FireBrowse", "bio.gene.hugo", linkouts.SINGLE_SELECT, function (names) {
    var gname = names[0];
    window.open('http://firebrowse.org/viewGene.html?gene=' + gname + '&search=' + gname, 'linkout');
});


// Linkouts to GEO
linkouts.addLinkout("View GEO Accession", "bio.geo.acc", linkouts.SINGLE_SELECT, function (aids) {
    var aid = aids[0];
    window.open('http://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=' + aid, 'linkout');
});


// Linkouts to GeneCards
linkouts.addLinkout("View GeneCards", "bio.gene.hugo", linkouts.SINGLE_SELECT, function (labels){
    window.open('http://www.genecards.org/Search/Keyword?queryString=' + labels[0]);
});


// Linkouts to GeneVisible
linkouts.addLinkout("View GeneVisible", "bio.protein.uniprotid", linkouts.SINGLE_SELECT, function (names) {
    var gname = names[0];
    window.open('https://genevisible.com/tissues/HS/UniProt/' + gname, 'linkout');
});
linkouts.addLinkout("View GeneVisible", "bio.gene.hugo", linkouts.SINGLE_SELECT, function (names) {
    var gname = names[0];
    window.open('https://genevisible.com/tissues/HS/Gene%20Symbol/' + gname, 'linkout');
});
linkouts.addLinkout("View GeneVisible", "bio.probe.affymetrix", linkouts.SINGLE_SELECT, function (names) {
    var psname = names[0];
    window.open('https://genevisible.com/tissues/HS/Affymetrix%20Probeset/' + psname, 'linkout');
});


// Linkouts to HGNC
linkouts.addLinkout("View HGNC", "bio.gene.hugo", linkouts.SINGLE_SELECT, function (names) {
    var gname = names[0];
    window.open('http://www.genenames.org/cgi-bin/gene_symbol_report?q=data/hgnc_data.php&match=' + gname, 'linkout');
});   


// Linkouts to MD Anderson Ideogram viewer.
linkouts.addLinkout("View ideogram", "bio.gene.hugo", linkouts.MULTI_SELECT, function (genes) {
    window.open('http://bioinformatics.mdanderson.org/ideogramviewer/Ideogram.html?genelist1=' + genes.join(','), 'linkout');
});
NgChm.LNK.addMatrixLinkout("View ideogram", "bio.gene.hugo", "bio.gene.hugo", linkouts.MULTI_SELECT, function (labels) {
    let genes1 = labels.Row;
    let genes2 = labels.Column;
    window.open('http://bioinformatics.mdanderson.org/ideogramviewer/Ideogram.html?genelist1=' + genes1.join(',') + '&genelist2=' + genes2.join(','), 'linkout');
});
linkouts.addLinkout("View ideogram", "bio.mirna", linkouts.MULTI_SELECT, function (mir) {
    window.open('http://bioinformatics.mdanderson.org/ideogramviewer/Ideogram.html?mirlist1=' + mir.join(','), 'linkout');
});
NgChm.LNK.addMatrixLinkout("View ideogram", ["bio.mirna"], ["bio.mirna"], linkouts.MULTI_SELECT, function (labels) {
    let mir1 = labels.Row;
    let mir2 = labels.Column;
    window.open('http://bioinformatics.mdanderson.org/ideogramviewer/Ideogram.html?mirlist1=' + mirs1.join(',') + '&mirlist2=' + mirs2.join(','), 'linkout');
});


// Linkouts to mirBase
linkouts.addLinkout("View miRBase Page", "bio.mirna", linkouts.SINGLE_SELECT, function (eids) {
    var gid = eids[0];
    window.open('http://www.mirbase.org/cgi-bin/query.pl?terms=' + gid, 'linkout');
});


// Linkouts to MuPIT
linkouts.addLinkout("View MuPIT", "bio.gene.hugo", linkouts.SINGLE_SELECT, function (genes) {
    genes = genes.sort().filter(function(el,i,a){return i==a.indexOf(el);});
    var glist = encodeURIComponent(genes[0]);
    window.open('http://mupit.icm.jhu.edu/?gene=' + glist, 'linkout');
});


// Linkouts to NCBI Gene
linkouts.addLinkout("View NCBI Gene", "bio.gene.hugo", linkouts.SINGLE_SELECT, function (names) {
    var gname = names[0];
    window.open('http://www.ncbi.nlm.nih.gov/gene?term=(homo%20sapiens%5BOrganism%5D)%20AND%20' + gname + '%5BGene%20Name%5D', 'linkout');
});


// Linkouts to NCBI Entrez ID
(function() {
    function openNCBIEntrezIDPage (eids) {
        var gid = eids[0];
        window.open('http://www.ncbi.nlm.nih.gov/gene/' + gid, 'linkout');
    }
    linkouts.addLinkout("View NCBI Entrez ID", "bio.gene.entrezid", linkouts.SINGLE_SELECT,openNCBIEntrezIDPage);
    linkouts.addLinkout("View NCBI Entrez ID", "bio.gene.entrez", linkouts.SINGLE_SELECT,openNCBIEntrezIDPage);
})();


// Linkouts to OLSVis
linkouts.addLinkout("View OLSVis", "bio.go", linkouts.SINGLE_SELECT, function (names) {
    var goid = names[0];
    window.open('http://ols.wordvis.com/q=' + goid, 'linkout');
});


// Linkouts to QuickGO
linkouts.addLinkout("View QuickGO", "bio.go", linkouts.SINGLE_SELECT, function (names) {
    var goid = names[0];
    window.open('http://www.ebi.ac.uk/QuickGO/GTerm?id=' + goid, 'linkout');
});


// Linkouts to MD Anderson Pathways Viewer
(function() {
    function openMDACCPathwayID (names) { 
        var gname = names[0];
        window.open('http://bioinformatics.mdanderson.org/PathwaysBrowser/pathway/latest/mdaPathwayId/' + gname, 'linkout');
    };  
    linkouts.addLinkout("View Pathways Browser", "bio.mdacc.pathwayid", linkouts.SINGLE_SELECT, openMDACCPathwayID);
    linkouts.addLinkout("View Pathways Browser", "bio.pathway.mdanderson", linkouts.SINGLE_SELECT, openMDACCPathwayID);
})();
linkouts.addLinkout("View Pathways Browser", "bio.go", linkouts.SINGLE_SELECT, function (names) {
    var goid = names[0];
    window.open('http://bioinformatics.mdanderson.org/PathwaysBrowser/goTerm/latest/goId/' + goid, 'linkout');
});  


// Linkouts for PeptideAtlas
linkouts.addLinkout("View PeptideAtlas", "bio.protein.uniprotid", linkouts.SINGLE_SELECT, function (names) {
    var gname = names[0];
    window.open('https://db.systemsbiology.net/sbeams/cgi/PeptideAtlas/Search?action=GO&search_key=' + gname, 'linkout'); 
});  


// Linkouts for Tumor Portal
linkouts.addLinkout("View Tumor Portal", "bio.gene.hugo", linkouts.SINGLE_SELECT, function (names) {
    var gname = names[0];
    window.open('http://www.tumorportal.org/view?geneSymbol=' + gname, 'linkout');
});    


// Linkouts for Uniprot
linkouts.addLinkout("View Uniprot", "bio.protein.uniprotid", linkouts.SINGLE_SELECT, function (names) {
    var gname = names[0];
    window.open('http://www.uniprot.org/uniprot/' + gname, 'linkout'); 
});    


// Linkouts for Zodiac
linkouts.addLinkout("View Zodiac", "bio.gene.hugo", linkouts.MULTI_SELECT, function (genes) {
    genes = genes.sort().filter(function(el,i,a){return i==a.indexOf(el);});
    var glist = encodeURIComponent(genes.join('\n'));
    window.open('http://compgenome.org/zodiac?Gene_List=' + glist, 'linkout');
});
NgChm.LNK.addMatrixLinkout("View Zodiac", ["bio.gene.hugo"], ["bio.gene.hugo"], linkouts.MULTI_SELECT, function (labels) {
    let g1 = labels.Row.sort().filter(function(el,i,a){return i==a.indexOf(el);});
    let g2 = labels.Column.sort().filter(function(el,i,a){return i==a.indexOf(el);});
    var glist = encodeURIComponent(g1.concat(g2).join('\n'));
    window.open('http://compgenome.org/zodiac?Gene_List=' + glist, 'linkout');
});


// ##### "SEARCH" linkouts


// Linkouts to Ensembl
linkouts.addLinkout("Search Ensembl", "bio.gene.hugo", linkouts.SINGLE_SELECT, function (names) {
    var gname = names[0];
    window.open('http://ensembl.org/Multi/psychic?site=ensembl&species=Homo_sapiens&q=' + gname, 'linkout');
});
linkouts.addLinkout("Search Ensembl", "bio.transcript.ensembl", linkouts.SINGLE_SELECT, function (names) {
    var tname = names[0];
    window.open('http://ensembl.org/Multi/psychic?site=ensembl&species=Homo_sapiens&q=' + tname, 'linkout');
});


// Linkouts to search pubmed
linkouts.addLinkout("Search PubMed for All", "bio.pubmed.search", linkouts.MULTI_SELECT, function (labels){
	window.open("http://www.ncbi.nlm.nih.gov/pubmed/?term=" + labels.join('+AND+'));
});
linkouts.addLinkout("Search PubMed for Any", "bio.pubmed.search", linkouts.MULTI_SELECT, function (labels){
	window.open("http://www.ncbi.nlm.nih.gov/pubmed/?term=" + labels.join('+OR+'));
});



// Linkouts to search ClinicalTrials.gov
linkouts.addLinkout("Search ClinicalTrials.gov", "bio.gene.hugo", linkouts.MULTI_SELECT, function (labels) {
    var gname = labels.join('+AND+');
    window.open('http://clinicaltrials.gov/ct2/results?term=' + gname + '&Search=' + 'Search', 'linkout');
});


// Linkouts to search NCBI
linkouts.addLinkout("Search NCBI Databases", "bio.gene.hugo", linkouts.SINGLE_SELECT, function (names) {
    var gname = names[0];
    window.open('http://www.ncbi.nlm.nih.gov/gquery/?term=((' + gname + '%5BGene+Symbol%5D)+AND+Homo+sapiens%5BOrganism%5D)', 'linkout');
});  


// Linkouts to search Vega
linkouts.addLinkout("Search Vega", "bio.gene.hugo", linkouts.SINGLE_SELECT, function (names) {
    var gname = names[0];
    window.open('http://vega.sanger.ac.uk/Homo_sapiens/psychic?site=vega&q=' + gname, 'linkout');
});  


// Linkouts for scholarly terms
linkouts.addLinkout("Search Google Scholar", "scholar", linkouts.MULTI_SELECT, function (labels) {
    window.open('http://scholar.google.com/scholar?q=' + labels.join('+OR+'), 'linkout');
});
