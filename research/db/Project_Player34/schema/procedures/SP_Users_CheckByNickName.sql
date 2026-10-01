-- SQL_STORED_PROCEDURE dbo.SP_Users_CheckByNickName (modified 2021-06-04T05:18:36.067)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：获取一条用户信息>
-- =============================================
CREATE   Procedure [dbo].[SP_Users_CheckByNickName]
@NickName Nvarchar(200)
as


select UserID from Sys_Users_Detail where NickName=@NickName and IsExist = 1
UNION All
SELECT UserID FROM Rename_Nick where NickName=@NickName







GO
