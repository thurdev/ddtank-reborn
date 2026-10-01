-- SQL_STORED_PROCEDURE dbo.SP_Users_SingleByNickName (modified 2021-06-04T05:18:36.490)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：获取一条用户信息>
-- =============================================
CREATE Procedure [dbo].[SP_Users_SingleByNickName]
@NickName Nvarchar(200)
as

select * from V_Sys_Users_Detail
where NickName=@NickName and IsExist = 1







GO
