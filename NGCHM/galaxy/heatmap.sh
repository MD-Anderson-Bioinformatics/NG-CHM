echo $1 $2 $3 $4 $5 $6 $7 $8 $9 ${10} ${11} ${12} ${13} ${14} ${15}

#create temp directory for row and col order and dendro files.
tdir=${11}/$(date +%s)
echo $tdir
mkdir $tdir

#run R to cluster matrix
R --slave --vanilla --file=${11}/CHM.R --args $3 $4 $5 $6 $7 $8 $9 $tdir/ROfile.txt $tdir/COfile.txt $tdir/RDfile.txt $tdir/CDfile.txt


#there are a variable number of triplicate parameters for classification bars
count=0
classifcations=''

for i in "$@"; do
  if [ $count -gt 10 ]
  then
    classifications=$classifications' '$i
  fi

  count=$((count+1))
done

#call java program to generate NGCHM viewer files.
java -jar ${11}/GalaxyMapGen.jar $1 $2 DataLayer1 $3 linear Row Column $4 $5 $6 $tdir/ROfile.txt $tdir/RDfile.txt $7 $8 $9 $tdir/COfile.txt $tdir/CDfile.txt ${10} $classifications

#clean up tempdir
#rm -rf $tdir
