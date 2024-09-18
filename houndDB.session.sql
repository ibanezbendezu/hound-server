select c.* from public.Comparison c 
INNER JOIN public._ComparisonToGroup cg on c.id = cg.a 
INNER JOIN public.Group g on cg.b = g.id 
where g.sha = 'bbfaa607e0d4fdd4edf1453d9611272383b2d4290963f4d03436e42799ac841b';