/*
Function to get basic statistics for a set of values
	Input:
		dist: array of values
	Ouptut:
		Object: {
		           mu: mean
		           std: standard deviation (n-1 in denominator)
		           variance: std^2
		           n: number of values
		        }
*/
function getStats(dist) {
  var mu = jStat.mean(dist); // mean
  var std = jStat.stdev(dist, true); // standard deviation.  true for sample standard deviation, i.e. unbiasted estimator, i.e. (n-1) in denominator
  var variance = std * std; // variance
  var n = dist.length;
  return { mu: mu, std: std, variance: variance, n: n };
}
/*
	Function to return test statistic for Welch's t-test
	Assumptions for use:
		- two sets of values
		- sets of values have unequal variances (can have unequal sizes also)
		- unpaired samples
	Inputs:
		s1: summary statistics for first set. This is the OUTPUT of getStats function
		s2: summary statistics for second set. This is the OUTPUT of getStats function
	Output:
		tvalue
*/
function Welch_tValue(s1, s2) {
  return (s1.mu - s2.mu) / Math.sqrt(s1.variance / s1.n + s2.variance / s2.n);
}
/*
	Function to return degrees of freedom for two sets with different variances
	Inputs:
		s1: summary statistics for first set. This is the OUTPUT of getStats function
		s2: summary statistics for second set. This is the OUTPUT of getStats function
	Output:
		number of values free to vary
*/
function degreesOfFreedom(s1, s2) {
  return (
    Math.pow(s1.variance / s1.n + s2.variance / s2.n, 2) /
    (Math.pow(s1.variance / s1.n, 2) / (s1.n - 1) +
      Math.pow(s2.variance / s2.n, 2) / (s2.n - 1))
  );
}
/*
	Function to calculate pvalue
	Inputs:
		tvalue: test statistic; output of Welch_tValue
		dof: degrees of freedom; output of dof
	Output:
		p-value
*/
function pValue(tvalue, dof) {
  return jStat.studentt.cdf(-Math.abs(tvalue), dof) * 2;
}
