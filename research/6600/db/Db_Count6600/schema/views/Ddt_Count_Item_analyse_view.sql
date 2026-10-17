-- VIEW dbo.Ddt_Count_Item_analyse_view (modified 2012-04-21T07:53:24.717)
CREATE VIEW [dbo].[Ddt_Count_Item_analyse_view]
-- Author:andy -- Date:2009-09-01  -- Description:物品分析
AS
  select top 0 B.Name,B.CategoryId,id,Count_ItemDataLog.TemplateId,LoginMonth,Day1+Day2+Day3+Day4+Day5+Day6+Day7+Day8+Day9+Day10+Day11+Day12+Day13+Day14+Day15+Day16+Day17+Day18+Day19+Day20+Day21+Day22+Day23+Day24+Day25+Day26+Day27+Day28+Day29+Day30+Day31 as total,
Day1,Day2,Day3,Day4,Day5,Day6,Day7,Day8,Day9,Day10,Day11,Day12,Day13,Day14,Day15,Day16,Day17,Day18,Day19,Day20,Day21,Day22,Day23,Day24,Day25,Day26,Day27,Day28,Day29,Day30,Day31 
From  Count_ItemDataLog left join Ddtc_Shop_Goods  B
On Count_ItemDataLog.TemplateId=B.TemplateId


GO
