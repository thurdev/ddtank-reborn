-- SQL_STORED_PROCEDURE dbo.Ddt_Count_ItemMoneyLog_analyse_Sto (modified 2012-04-21T07:53:25.153)


CREATE  PROCEDURE  Ddt_Count_ItemMoneyLog_analyse_Sto
-- Author:andy -- Date:2009-09-01  -- Description:物品金额分析
  @Begin_Date Varchar(20), 
  @End_Date Varchar(20),
  @strcategory Varchar(200),
  @type Varchar(10)
  AS  
BEGIN
 if( @type='1')
   begin 
  select B.Name,B.CategoryId,id,Count_ItemMoneyLog.TemplateId,LoginMonth,Day1+Day2+Day3+Day4+Day5+Day6+Day7+Day8+Day9+Day10+Day11+Day12+Day13+Day14+Day15+Day16+Day17+Day18+Day19+Day20+Day21+Day22+Day23+Day24+Day25+Day26+Day27+Day28+Day29+Day30+Day31 as total,
Day1,Day2,Day3,Day4,Day5,Day6,Day7,Day8,Day9,Day10,Day11,Day12,Day13,Day14,Day15,Day16,Day17,Day18,Day19,Day20,Day21,Day22,Day23,Day24,Day25,Day26,Day27,Day28,Day29,Day30,Day31 
From  Count_ItemMoneyLog left join Ddtc_Shop_Goods  B
On Count_ItemMoneyLog.TemplateId=B.TemplateId
Where loginmonth>=@Begin_Date and loginmonth<=@End_Date and CharIndex(','+Cast(B.CategoryId As Varchar(10))+',',@strcategory)>0 
order by LoginMonth desc,B.CategoryId asc
   end 
else
begin
  select B.Name,B.CategoryId,id,Count_ItemMoneyLog.TemplateId,LoginMonth,Day1+Day2+Day3+Day4+Day5+Day6+Day7+Day8+Day9+Day10+Day11+Day12+Day13+Day14+Day15+Day16+Day17+Day18+Day19+Day20+Day21+Day22+Day23+Day24+Day25+Day26+Day27+Day28+Day29+Day30+Day31 as total,
Day1,Day2,Day3,Day4,Day5,Day6,Day7,Day8,Day9,Day10,Day11,Day12,Day13,Day14,Day15,Day16,Day17,Day18,Day19,Day20,Day21,Day22,Day23,Day24,Day25,Day26,Day27,Day28,Day29,Day30,Day31 
From  Count_ItemMoneyLog left join Ddtc_Shop_Goods  B
On Count_ItemMoneyLog.TemplateId=B.TemplateId
Where loginmonth>=@Begin_Date and loginmonth<=@End_Date  order by LoginMonth desc,B.CategoryId asc
 end
END

GO
