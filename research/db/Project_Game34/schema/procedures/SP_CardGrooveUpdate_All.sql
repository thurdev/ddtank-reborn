-- SQL_STORED_PROCEDURE dbo.SP_CardGrooveUpdate_All (modified 2021-06-04T01:29:17.797)







-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_CardGrooveUpdate_All]
--@Grade int
AS  
 select * from [dbo].[Card_Groove_Update] --where [Grage] = @Grade
 










GO
