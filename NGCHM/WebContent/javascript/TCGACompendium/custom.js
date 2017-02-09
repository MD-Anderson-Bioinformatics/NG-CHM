//==============================================//
// Link out file for NGCHM TCGA Compendium Maps //
//==============================================//

// linouts for samples
linkouts.addLinkout("View in cBio Portal", "SAMPLE", linkouts.SINGLE_SELECT,openCBIOSamp);

// linkouts for genes
linkouts.addLinkout("View points plot", ["GENE_SYM","GENE_ID"], linkouts.MULTI_SELECT,pointsplot,["dataset"]);
linkouts.addLinkout("View box plot", ["GENE_SYM","GENE_ID"], linkouts.MULTI_SELECT,boxplot,["dataset"]);
linkouts.addLinkout("View ideogram", "GENE_SYM", linkouts.MULTI_SELECT,ideogram,["dataset"]);
linkouts.addLinkout("Search GeneCards", "GENE_SYM", linkouts.SINGLE_SELECT,searchGeneCards);
linkouts.addLinkout("Search ClinicalTrials.gov", "GENE_SYM", linkouts.MULTI_SELECT,searchClinicalTrials);
linkouts.addLinkout("View NCBI Gene", "GENE_SYM", linkouts.SINGLE_SELECT,openNCBIGenePage);
linkouts.addLinkout("View NCBI Entrez ID", "GENE_ID", linkouts.SINGLE_SELECT,openNCBIEntrezIDPage);
linkouts.addLinkout("Search Google Scholar", "GENE_SYM", linkouts.MULTI_SELECT,searchGoogleScholar);
linkouts.addLinkout("Search PubMed for All", "GENE_SYM", linkouts.MULTI_SELECT,searchPubMedForAll);
linkouts.addLinkout("Search PubMed for Any", "GENE_SYM", linkouts.MULTI_SELECT,searchPubMedForAny);
linkouts.addLinkout("View in cBio Portal", "GENE_SYM", linkouts.MULTI_SELECT,openCBIOGenes, ["studyId"]);


// linkouts for methylation probes
linkouts.addLinkout("View points plot", ["PROBE","GENE_SYM"], linkouts.MULTI_SELECT,pointsplot,["dataset"]);
linkouts.addLinkout("View box plot", ["PROBE","GENE_SYM"], linkouts.MULTI_SELECT,boxplot,["dataset"]);

// linkouts for micro RNA
linkouts.addLinkout("View points plot", "MIRNA_SYM", linkouts.MULTI_SELECT,pointsplot,["dataset"]);
linkouts.addLinkout("View box plot", "MIRNA_SYM", linkouts.MULTI_SELECT,boxplot,["dataset"]);
linkouts.addLinkout("View ideogram", "MIRNA_SYM", linkouts.MULTI_SELECT,ideogramMIRNA,["dataset"]);
linkouts.addLinkout("Search Google Scholar", "MIRNA_SYM", linkouts.MULTI_SELECT,searchGoogleScholar);
linkouts.addLinkout("View miRBase Page", "MIRNA_SYM", linkouts.SINGLE_SELECT,viewMiRBasePage);

// matrix linkouts for symmetric maps
NgChm.LNK.addMatrixLinkout("View scatter plot", ["GENE_SYM","GENE_ID"], ["GENE_SYM","GENE_ID"], linkouts.MULTI_SELECT,scatterplot,["dataset"]);
NgChm.LNK.addMatrixLinkout("View cordist plot", ["GENE_SYM","GENE_ID"], ["GENE_SYM","GENE_ID"], linkouts.MULTI_SELECT,cordistplot,["dataset"]);
// this is here to prevent duplicate linkouts for maps with GeneSym and GeneID labelTypes
if (NgChm.heatMap.getColLabels().label_type.indexOf("GENE_ID") == -1 && NgChm.heatMap.getRowLabels().label_type.indexOf("GENE_ID") == -1){
	NgChm.LNK.addMatrixLinkout("View scatter plot", "GENE_SYM", "GENE_SYM", linkouts.MULTI_SELECT,scatterplot,["dataset"]);
	NgChm.LNK.addMatrixLinkout("View cordist plot", "GENE_SYM", "GENE_SYM", linkouts.MULTI_SELECT,cordistplot,["dataset"]);
}


NgChm.LNK.addMatrixLinkout("View scatter plot", "MIRNA_SYM", "MIRNA_SYM", linkouts.MULTI_SELECT,scatterplot,["dataset"]);
NgChm.LNK.addMatrixLinkout("View cordist plot", "MIRNA_SYM", "MIRNA_SYM", linkouts.MULTI_SELECT,cordistplot,["dataset"]);

NgChm.LNK.addMatrixLinkout("View scatter plot", "SAMPLE", "SAMPLE", linkouts.MULTI_SELECT,scatterplot,["dataset"]);
NgChm.LNK.addMatrixLinkout("View cordist plot", "SAMPLE", "SAMPLE", linkouts.MULTI_SELECT,cordistplot,["dataset"]);

NgChm.LNK.addMatrixLinkout("View scatter plot", "GENE_SYM_ID", "GENE_SYM_ID", linkouts.MULTI_SELECT,scatterplot,["dataset"]);
NgChm.LNK.addMatrixLinkout("View cordist plot", "GENE_SYM_ID", "GENE_SYM_ID", linkouts.MULTI_SELECT,cordistplot,["dataset"]);


//========================//
// functions defined here //
//========================//

function pointsplot(labels){
	var dataset = linkouts.getAttribute('dataset');
	var url = 'http://bioinformatics.mdanderson.org/chmv/pointsplot.html?chm=' + linkouts.getMapName() + '&dataset=' + dataset + '&labels=' + labels;
	url =  url.replace(/\|/g, '%7C');
	window.open(url,
            'PointsPlot',
            'location=no,toolbar=no,scrollbars=yes,directories=no,menubar=no,status=no');
}

function boxplot(labels){
	var dataset = linkouts.getAttribute('dataset');
	var url = 'http://bioinformatics.mdanderson.org/chmv/boxplot.html?chm=' + linkouts.getMapName() + '&dataset=' + dataset + '&labels=' + labels;
	url = url.replace(/\|/g, '%7C'); 
	window.open(url,
            'BoxPlot',
            'location=no,toolbar=no,scrollbars=yes,directories=no,menubar=no,status=no');
}

function ideogram(labels){
	window.open('http://bioinformatics.mdanderson.org/ideogramviewer/Ideogram.html?genelist1=' + labels.join(','),
    'ideogram');
}

function ideogramMIRNA(labels){
	window.open('http://bioinformatics.mdanderson.org/ideogramviewer/Ideogram.html?mirlist1=' + labels.join(','),
    'ideogram');
}

function searchGoogle(selection){
	window.open('https://www.google.com/#q=' + selection.join("+"));
}

function searchGeneCards(labels){
	window.open('http://www.genecards.org/Search/Keyword?queryString=' + labels[0]);
}

function searchPubMedForAll(labels){
	window.open("http://www.ncbi.nlm.nih.gov/pubmed/?term=" + labels.join('+AND+'));
}

function searchPubMedForAny(labels){
	window.open("http://www.ncbi.nlm.nih.gov/pubmed/?term=" + labels.join('+OR+'));
}

function searchClinicalTrials (labels) {
    var gname = labels.join('+AND+');
    window.open('http://clinicaltrials.gov/ct2/results?term=' + gname + '&Search=' + 'Search', 'clinicaltrials');
}

function openNCBIGenePage (names) {
    var gname = names[0];
    window.open('http://www.ncbi.nlm.nih.gov/gene?term=(homo%20sapiens%5BOrganism%5D)%20AND%20' + gname + '%5BGene%20Name%5D', 'NCBI');
}
function openNCBIEntrezIDPage (eids) {
    var gid = eids[0];
    window.open('http://www.ncbi.nlm.nih.gov/gene/' + gid, 'NCBI');
}

function searchGoogleScholar (labels) {
	  window.open('http://scholar.google.com/scholar?q=' + labels.join('+OR+'),
	              'pubmed');
};

function viewMiRBasePage (eids) {
    var gid = eids[0];
    window.open('http://www.mirbase.org/cgi-bin/query.pl?terms=' + gid, 'miRBase');
}

function openCBIOGenes ( genes) {
	var studyid = linkouts.getAttribute('studyId');
	window.open('http://www.cbioportal.org/ln?cancer_study_id=' + studyid + '&gene_list=' + genes.join("+"), 'cbio');
}

function openCBIOSamp (id) {
	var studyid = linkouts.getAttribute('studyId');
    var part = id[0].substring(0,12);
    window.open('http://www.cbioportal.org/case.do?cancer_study_id=' + studyid + '&case_id=' + part, 'cbio');
}

function scatterplot(labels){
	var dataset = linkouts.getAttribute('dataset');
	var labelsFiltered = removeDuplicates(labels);
	var url = 'http://bioinformatics.mdanderson.org/chmv/scatterplot.html?chm=' + linkouts.getMapName() + '&dataset=' + dataset + '&labels=' + labelsFiltered;
	url =  url.replace(/\|/g, '%7C');
	window.open(url,
            'ScatterPlot',
            'location=no,toolbar=no,scrollbars=yes,directories=no,menubar=no,status=no');
}

function cordistplot(labels){
	var dataset = linkouts.getAttribute('dataset');
	var url = 'http://bioinformatics.mdanderson.org/chmv/cordistplot.html?chm=' + linkouts.getMapName() + '&dataset=' + dataset + '&label1=' + labels["Row"][0] + '&label2=' + labels["Column"][0];
	url =  url.replace(/\|/g, '%7C');
	window.open(url,
            'CordistPlot',
            'location=no,toolbar=no,scrollbars=yes,directories=no,menubar=no,status=no');
}

// HELPER FUNCTIONS
function removeDuplicates(labels){
	var returnLabels = labels["Row"];
	for (var i = 0; i < labels["Column"].length; i++){
		if (returnLabels.indexOf(labels["Column"][i]) < 0){
			returnLabels.push(labels["Column"][i]);
		}
	}
	return returnLabels;
}