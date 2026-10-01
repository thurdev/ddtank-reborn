-- SQL_STORED_PROCEDURE dbo.SP_FightSpiritTemplate_All (modified 2022-02-01T06:40:30.450)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_FightSpiritTemplate_All]
--@Grade int
AS  
 select * from [dbo].[Fight_Spirit_Templatelist] --where [Grage] = @Grade
 



GO
