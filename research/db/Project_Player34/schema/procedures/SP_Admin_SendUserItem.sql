-- SQL_STORED_PROCEDURE dbo.SP_Admin_SendUserItem (modified 2021-06-04T05:18:34.667)

-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<后台用的物品赠送:旧版已废>
-- =============================================
CREATE Procedure [dbo].[SP_Admin_SendUserItem]
--物品
 @ItemID int, 
 @UserID int, 
 @TemplateID int, 
 @Place int, 
 @Count int, 
 @IsJudge bit, 
 @Color nvarchar(100), 
 @IsExist bit, 
 @StrengthenLevel int, 
 @AttackCompose int, 
 @DefendCompose int, 
 @LuckCompose int, 
 @AgilityCompose int, 
 @IsBinds bit, 
 @BeginDate DateTime, 
 @ValidDate int,
 @BagType int,
--信箱
 @ID int output, 
 @SenderID int, 
 @Sender nvarchar(100), 
 @ReceiverID int, 
 @Receiver nvarchar(100), 
 @Title nvarchar(1000), 
 @Content nvarchar(4000), 
 @SendTime DateTime, 
 @IsRead bit, 
 @IsDelR bit, 
 @IfDelS bit, 
 @IsDelete bit, 
 @Annex1 nvarchar(100), 
 @Annex2 nvarchar(100), 
 @Gold int, 
 @Money int
--共用 @IsExist bit
AS  

declare @temp int
declare @maxCount int
declare @NickName varchar(50)
declare @Remark nvarchar(200)

set @NickName=''
select @NickName=NickName from  Sys_Users_Detail where UserID = @ReceiverID
if @NickName = ''
begin
  return 2
end

set @temp = 0
select @temp=isnull(TemplateID,0),@maxCount=isnull(MaxCount,1) from Shop_Goods where TemplateID = @TemplateID
if @temp = 0
begin
  set @TemplateID = 0
end

set xact_abort on 
begin tran

if @TemplateID <>0
begin
declare @getCount int
 while @Count > 0
 begin
   
   if @Count > @maxCount
   begin
     set @getCount = @maxCount
   end
   else
   begin
     set @getCount = @Count
   end
   set @Count = @Count-@getCount

   INSERT INTO Sys_Users_Goods( UserID, BagType,TemplateID, Place, Count, IsJudge, Color, IsExist, StrengthenLevel, AttackCompose, DefendCompose, LuckCompose, AgilityCompose, IsBinds, BeginDate, ValidDate) 
   VALUES( 0, @BagType,@TemplateID, -1, @getCount, @IsJudge, @Color, @IsExist, @StrengthenLevel, @AttackCompose, @DefendCompose, @LuckCompose, @AgilityCompose, @IsBinds, @BeginDate, @ValidDate)
   select @@identity as 'identity'
   set @ItemID=@@identity    

  if @@error<>0
    begin
      rollback tran
      return @@error
   end

  set @Remark = 'Gold:0,Money:0,Annex1:'+cast(@ItemID as varchar(20))+',Annex2:'+@Annex2
  INSERT INTO User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, IsExist,Type,Remark) 
     VALUES( @SenderID, @Sender, @ReceiverID, @NickName, @Title, @Content, @SendTime, @IsRead, @IsDelR, @IfDelS, @IsDelete, @ItemID, @Annex2, 0, 0, @IsExist,51,@Remark)

  if @@error<>0
  begin  
    rollback tran
    return @@error
  end
 end
end
if @Gold <>0  or  @Money<>0
begin

 set @Remark = 'Gold:'+cast(@Gold as varchar(20))+',Money:'+cast(@Money as varchar(20))+',Annex1:'+@Annex1+',Annex2:'+@Annex2
 INSERT INTO User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, IsExist,Type,Remark) 
     VALUES( @SenderID, @Sender, @ReceiverID, @NickName, @Title, @Content, @SendTime, @IsRead, @IsDelR, @IfDelS, @IsDelete, @Annex1, @Annex2, @Gold, @Money, @IsExist,51,@Remark)

  if @@error<>0
  begin  
    rollback tran
    return @@error
  end

end

if @TemplateID = 0 and @Gold =0  and  @Money=0
begin

 set @Remark = 'Gold:'+cast(@Gold as varchar(20))+',Money:'+cast(@Money as varchar(20))+',Annex1:'+@Annex1+',Annex2:'+@Annex2
 INSERT INTO User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, IsExist,Type,Remark) 
     VALUES( @SenderID, @Sender, @ReceiverID, @NickName, @Title, @Content, @SendTime, @IsRead, @IsDelR, @IfDelS, @IsDelete, @Annex1, @Annex2, @Gold, @Money, @IsExist,51,@Remark)

  if @@error<>0
  begin  
    rollback tran
    return @@error
  end

end

commit tran
set xact_abort off
return 0


GO
