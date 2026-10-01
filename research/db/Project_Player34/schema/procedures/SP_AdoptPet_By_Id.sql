-- SQL_STORED_PROCEDURE dbo.SP_AdoptPet_By_Id (modified 2021-06-04T05:18:34.687)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_AdoptPet_By_Id]
@ID int
AS  
 select * from [dbo].[AdoptPetList] where [PetID] = @ID and [IsUse] = 1


GO
