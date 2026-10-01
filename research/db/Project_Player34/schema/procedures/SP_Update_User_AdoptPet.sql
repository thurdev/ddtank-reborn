-- SQL_STORED_PROCEDURE dbo.SP_Update_User_AdoptPet (modified 2021-06-04T05:18:35.880)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<拍卖行：用户发布一个商品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Update_User_AdoptPet]
	@ID int
AS  

 UPDATE [dbo].[AdoptPetList]
  SET [IsExit] = 0,
	  [Place] = -1,
	  [IsUse] = 0
 WHERE [PetID] =@ID
 
 if(@@error <> 0)
begin
  return 1
  end


GO
