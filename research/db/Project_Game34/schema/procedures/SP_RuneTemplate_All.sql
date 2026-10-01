-- SQL_STORED_PROCEDURE dbo.SP_RuneTemplate_All (modified 2021-06-04T01:29:18.460)








-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_RuneTemplate_All]
--@Grade int
AS  
 select * from [dbo].[Rune_Template] --where [Grage] = @Grade
 











GO
