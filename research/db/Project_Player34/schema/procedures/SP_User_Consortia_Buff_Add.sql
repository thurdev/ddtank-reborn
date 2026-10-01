-- SQL_STORED_PROCEDURE dbo.SP_User_Consortia_Buff_Add (modified 2022-07-23T20:36:10.463)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：插入用户buff(防踢、双倍经验、双倍功勋)信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_User_Consortia_Buff_Add]   
			@ConsortiaID int
           ,@BufferID int
           ,@IsOpen bit
           ,@BeginDate datetime
           ,@ValidDate int
           ,@Type int
           ,@Value int
 
as
declare  @temp int
select @temp = count(*) from Consortia_Buffer where ConsortiaID=@ConsortiaID and [Type]=@Type
if @temp=0 
   begin 
    INSERT INTO [dbo].[Consortia_Buffer]
           ([ConsortiaID]
           ,[BufferID]
           ,[IsOpen]
           ,[BeginDate]
           ,[ValidDate]
           ,[Type]
           ,[Value])
     VALUES
           (@ConsortiaID
           ,@BufferID
           ,@IsOpen
           ,@BeginDate
           ,@ValidDate
           ,@Type
           ,@Value)
 end 
 else
   begin   
     UPDATE [dbo].[Consortia_Buffer]
   SET [IsOpen] = @IsOpen, [BufferID] = @BufferID
      ,[BeginDate] = @BeginDate
      ,[ValidDate] = @ValidDate
      ,[Type] = @Type
      ,[Value] = @Value
	  WHERE ConsortiaID=@ConsortiaID and [Type]=@Type
   end



GO
