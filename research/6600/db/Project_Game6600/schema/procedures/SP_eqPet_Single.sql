-- SQL_STORED_PROCEDURE dbo.SP_eqPet_Single (modified 2015-01-25T14:04:48.140)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：物品模板信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_eqPet_Single]
@ID int
AS  
 select * from [dbo].[Pet_Equip_Data] where [UserID] = @ID and [IsExit] = 1

GO
