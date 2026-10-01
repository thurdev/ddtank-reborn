-- SQL_STORED_PROCEDURE dbo.SP_Mail_BySenderID (modified 2022-08-06T20:20:13.943)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<邮件信息：显示当前用户最近21条已发送邮件>
-- =============================================
CREATE Procedure [dbo].[SP_Mail_BySenderID]
@UserID int
as

select top 21 * from User_Messages
where SenderID=@UserID and datediff(hh,SendTime,getdate())<240 and Type in (1,6,10,101) order by SendDate asc








GO
