-- SQL_STORED_PROCEDURE dbo.SP_Update_Marry_Apply (modified 2021-06-04T05:18:35.840)


-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<婚姻：清除结婚申请信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Update_Marry_Apply]
@UserID int,
@LoveProclamation nvarchar(50),
@isExist bit
 AS

update Marry_Apply set isExist=@isExist where UserID = @UserID and LoveProclamation = @LoveProclamation








GO
