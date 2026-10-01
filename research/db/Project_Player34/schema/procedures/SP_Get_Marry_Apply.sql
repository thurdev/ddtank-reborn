-- SQL_STORED_PROCEDURE dbo.SP_Get_Marry_Apply (modified 2021-06-04T05:18:35.350)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<结婚信息:更新结婚关系>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Get_Marry_Apply] 
@UserID int
AS

select * from Marry_Apply where UserID = @UserID and IsExist = 1

--update Marry_Apply set IsExist = 0 where  UserID = @UserID and ApplyType <> 1 and IsExist = 1
update Marry_Apply set IsExist = 0 where  UserID = @UserID and IsExist = 1 and ApplyType<>1







GO
