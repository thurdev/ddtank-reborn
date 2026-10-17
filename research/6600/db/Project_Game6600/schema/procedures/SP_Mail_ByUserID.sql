-- SQL_STORED_PROCEDURE dbo.SP_Mail_ByUserID (modified 2015-01-25T14:04:48.567)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<邮件信息：当前用户全部的有效邮件>
-- =============================================
CREATE Procedure [dbo].[SP_Mail_ByUserID]
@UserID int
as

select * from User_Messages
where IsExist=1 and ReceiverID=@UserID  and datediff(hh,SendTime,getdate())<ValidDate

GO
