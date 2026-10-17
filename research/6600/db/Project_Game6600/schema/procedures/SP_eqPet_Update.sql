-- SQL_STORED_PROCEDURE dbo.SP_eqPet_Update (modified 2015-01-25T14:04:48.140)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_eqPet_Update]   
			@ID int
		   ,@UserID int
           ,@PetID int
           ,@eqType int
           ,@eqTemplateID int
           ,@startTime datetime
           ,@ValidDate int
           ,@IsExit bit
           
 AS 
  
   begin 
	UPDATE [dbo].[Pet_Equip_Data]
    SET [UserID] = @UserID
      ,[PetID] = @PetID
      ,[eqType] = @eqType
      ,[eqTemplateID] = @eqTemplateID
      ,[startTime] = @startTime
      ,[ValidDate] = @ValidDate
      ,[IsExit] = @IsExit
     WHERE [ID] = @ID
    end
    
if(@@error <> 0)
begin
  return 1 ---Return false insert error
end

GO
