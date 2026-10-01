-- SQL_STORED_PROCEDURE dbo.SP_Get_Exercise_By_Grade (modified 2021-06-04T01:29:18.037)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Get_Exercise_By_Grade]
@Grade int
AS  
 select * from [dbo].[ExerciseInfo] where [Grage] = @Grade
 








GO
