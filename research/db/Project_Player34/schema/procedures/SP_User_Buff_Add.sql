-- SQL_STORED_PROCEDURE dbo.SP_User_Buff_Add (modified 2021-06-04T05:18:35.950)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：插入用户buff(防踢、双倍经验、双倍功勋)信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_User_Buff_Add]   
 @UserId int, 
 @Type int, 
 @BeginDate DateTime, 
 @Data nvarchar(200), 
 @IsExist bit,
 @ValidDate int,
 @ValidCount int,
 @Value int,
 @TemplateID int
 
as
declare  @temp int
select @temp = count(*) from User_Buff where UserId=@UserId and Type=@Type
if @temp=0 
   begin 
     INSERT INTO User_Buff(UserId, Type, BeginDate, Data, IsExist,ValidDate,Value,[ValidCount],[TemplateID]) 
     VALUES(@UserId, @Type, @BeginDate , @Data, @IsExist,@ValidDate,@Value,@ValidCount,@TemplateID) 
 end 
 else
   begin   
     UPDATE User_Buff Set  BeginDate=@BeginDate, Data=@Data, IsExist=@IsExist,ValidDate=@ValidDate,Value=@Value,[ValidCount]=@ValidCount,[TemplateID] = @TemplateID WHERE UserId=@UserId and Type=@Type
   end










GO
