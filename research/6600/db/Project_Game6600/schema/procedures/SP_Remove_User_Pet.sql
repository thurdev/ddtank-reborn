-- SQL_STORED_PROCEDURE dbo.SP_Remove_User_Pet (modified 2015-01-25T14:04:48.707)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<拍卖行：用户发布一个商品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Remove_User_Pet]
	@ID int
AS  

 UPDATE [dbo].[Sys_Users_Pet]
  SET [IsExit] = 0
	 ,[Place]  = -1
 WHERE [ID] =@ID -- and [Place] = @Place and [ID] = @ID 
 return 0 
 if(@@error <> 0)
begin
  return 1 ---Return false insert error
  end

GO
