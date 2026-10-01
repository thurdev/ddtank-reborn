-- SQL_STORED_PROCEDURE dbo.SP_Users_Gift_Add (modified 2021-06-04T05:18:36.130)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：用户新增一个物品>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_Gift_Add]
 @SenderID int, 
 @ReceiverID int, 
 @TemplateID int, 
 @Count int

AS  
 insert into Sys_Users_Gift (SenderID, ReceiverID, TemplateID, Count) values (@SenderID, @ReceiverID, @TemplateID, @Count)


GO
