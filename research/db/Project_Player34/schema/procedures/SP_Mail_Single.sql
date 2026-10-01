-- SQL_STORED_PROCEDURE dbo.SP_Mail_Single (modified 2021-06-04T05:18:35.583)


-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<邮件信息：显示一条邮件>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Mail_Single]   
 @ID int, 
 @UserID int
AS  

   begin 
     select * from User_Messages WHERE ID=@ID and ReceiverID = @UserID and IsExist = 1 --and type<100
     --应临时取消付费邮件select * from User_Messages WHERE ID=@ID and ReceiverID = @UserID and IsExist = 1
   end







GO
