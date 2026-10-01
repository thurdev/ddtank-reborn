-- SQL_STORED_PROCEDURE dbo.SP_Consortia_CheckByName (modified 2021-06-04T05:18:34.900)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：获取一条用户信息>
-- =============================================
CREATE   Procedure [dbo].[SP_Consortia_CheckByName]
@ConsortiaName Nvarchar(200)
as


select ConsortiaID from Consortia where ConsortiaName=@ConsortiaName and IsExist = 1
UNION All
SELECT ConsortiaID FROM Rename_Consortia where ConsortiaName=@ConsortiaName








GO
