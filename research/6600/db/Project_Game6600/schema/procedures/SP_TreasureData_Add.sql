-- SQL_STORED_PROCEDURE dbo.SP_TreasureData_Add (modified 2015-01-25T14:04:48.240)
CREATE PROCEDURE [dbo].[SP_TreasureData_Add]			
            @ID int output
           ,@UserID int
           ,@TemplateID int
           ,@Count int
           ,@Validate int
           ,@Pos int
           ,@BeginDate datetime
           ,@IsExit bit
AS
BEGIN
    -- Insert statements for procedure here
    INSERT INTO [dbo].[Treasure_Data]
           ([UserID]
           ,[TemplateID]
           ,[Count]
           ,[Validate]
           ,[Pos]
           ,[BeginDate]
           ,[IsExit])
     VALUES
           (@UserID
           ,@TemplateID
           ,@Count
           ,@Validate
           ,@Pos
           ,@BeginDate
           ,@IsExit)
	select @@identity as 'identity'
    set @ID=@@identity 
	return 0
	
	if(@@error <> 0)
	begin
	  return 1
	end

END

GO
