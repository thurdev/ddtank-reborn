-- SQL_STORED_PROCEDURE dbo.SP_Clear_AdoptPet (modified 2021-06-04T05:18:34.817)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<拍卖行：用户发布一个商品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Clear_AdoptPet]
	@ID int
AS  

 UPDATE [dbo].[AdoptPetList]
  SET [IsExit] = 0
	 ,[Place]  = -1
 WHERE [ID] = @ID  and [PetID] = 0 
 return 0 
 if(@@error <> 0)
begin
  return 1 ---Return false insert error
  end


GO
