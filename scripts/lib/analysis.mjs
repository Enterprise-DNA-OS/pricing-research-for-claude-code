export const thresholds=['too_cheap','cheap','expensive','too_expensive'];
export function curves(responses) {
 const prices=[...new Set(responses.flatMap(r=>thresholds.map(k=>Number(r[k]))))].sort((a,b)=>a-b);
 const n=responses.length;
 return prices.map(price=>({price,sample:n,...Object.fromEntries(thresholds.map((k,i)=>[k+'_pct',100*responses.filter(r=>i<2?Number(r[k])>=price:Number(r[k])<=price).length/n]))}));
}
// Piecewise-linear intersections. An equal interval remains an interval, never a false unique optimum.
export function intersection(points,a,b) {
 const hits=[];
 for(let i=0;i<points.length;i++){
  const p=points[i],d=p[a]-p[b];if(Math.abs(d)<1e-10)hits.push(p.price);
  if(i){const prev=points[i-1],pd=prev[a]-prev[b];if(pd*d<0)hits.push(prev.price+(p.price-prev.price)*pd/(pd-d));}
 }
 return hits.length?{low:Math.min(...hits),high:Math.max(...hits)}:{low:null,high:null};
}
export function summary(responses,study,segment=null){
 const c=curves(responses),n=responses.length;
 const pairs=[['marginal cheapness','too_cheap_pct','expensive_pct'],['marginal expensiveness','cheap_pct','too_expensive_pct'],['extreme balance','too_cheap_pct','too_expensive_pct'],['indifference','cheap_pct','expensive_pct']];
 return pairs.map(([metric,a,b])=>({study:study.name,segment:segment??'All responses',currency:study.currency,unit:study.price_unit,sample:n,metric,...(n<study.min_sample?{low:null,high:null}:intersection(c,a,b)),status:n<study.min_sample?'below minimum: results withheld':'exploratory price perceptions'}));
}
